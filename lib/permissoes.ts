export const PERFIS_COMERCIAIS = ['ADMIN', 'USER', 'COMERCIAL'] as const;
export const PERFIS_REGISTRO_PONTO = ['PONTO', 'OUTRO'] as const;
export const PERFIS_RELATORIO_PONTO = ['ADMIN', ...PERFIS_REGISTRO_PONTO] as const;
export const PERFIS_AVULSOS = ['PONTO', 'COMERCIAL'] as const;
export type PerfilAvulso = (typeof PERFIS_AVULSOS)[number];

export const ESCOPOS_AVULSOS: Record<PerfilAvulso, string> = {
  PONTO: 'Ponto e relatórios',
  COMERCIAL: 'Orçamentos, materiais e produtos',
};

export function permite(perfis: readonly string[], role: string | undefined) {
  return role !== undefined && perfis.includes(role);
}

export function ehPerfilAvulso(role: string): role is PerfilAvulso {
  return permite(PERFIS_AVULSOS, role);
}
