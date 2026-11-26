#!/usr/bin/env bash
set -euo pipefail

revisao=${1:?Informe o SHA do commit}
diretorio=${2:?Informe o diretório temporário}
checksum=${3:?Informe o SHA-256 do arquivo}
[[ "$revisao" =~ ^[a-f0-9]{40}$ && "$diretorio" =~ ^/tmp/gyn-web\.[a-zA-Z0-9]+$ && "$checksum" =~ ^[a-f0-9]{64}$ ]]
cd "$diretorio"
trap 'rm -f -- "$diretorio/gyn-web.tar.gz"; rmdir -- "$diretorio"' EXIT

exec 9>/var/lock/gyn-publicar-web.lock
flock -n 9 || { echo 'Já existe uma publicação em andamento.' >&2; exit 1; }
printf '%s  gyn-web.tar.gz\n' "$checksum" | sha256sum --check

servico=sistema-gyn-acrlico-gynweb-o5zq8p
imagem="gyn-web:$revisao"
docker image load --input gyn-web.tar.gz
[[ "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$imagem")" == "$revisao" ]]
anterior=$(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$servico")
if [[ "$anterior" != "$imagem" ]]; then
  docker service update --detach --no-resolve-image --image "$imagem" --update-monitor 65s "$servico"
fi

for tentativa in $(seq 1 36); do
  estado=$(docker service inspect --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}' "$servico")
  case "$estado" in
    rollback_started|rollback_paused|rollback_completed|paused)
      echo "A publicação parou com estado $estado." >&2
      exit 1
      ;;
  esac
  container=$(docker ps -q --filter "label=com.docker.swarm.service.name=$servico" --filter "ancestor=$imagem" --filter health=healthy | head -n 1)
  if [[ -n "$container" && ( -z "$estado" || "$estado" == completed ) ]]; then
    echo "Imagem ativa e saudável: $imagem"
    exit 0
  fi
  sleep 5
done

if [[ "$anterior" != "$imagem" && "$(docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$servico")" == "$imagem" ]]; then
  docker service rollback --detach "$servico"
fi
echo 'A nova imagem não ficou saudável dentro do prazo.' >&2
exit 1
