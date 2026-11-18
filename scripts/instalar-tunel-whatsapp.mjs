import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { sessionPath } from './whatsapp-caminhos.mjs';

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Instalador preparado para Windows x64.');
const releaseResponse = await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest', { signal: AbortSignal.timeout(30000) });
if (!releaseResponse.ok) throw new Error('Não foi possível consultar a versão oficial.');
const release = await releaseResponse.json();
const asset = release.assets.find(item => item.name === 'cloudflared-windows-amd64.exe');
if (!asset?.digest?.startsWith('sha256:')) throw new Error('Checksum oficial ausente.');
const response = await fetch(asset.browser_download_url, { signal: AbortSignal.timeout(120000) });
if (!response.ok) throw new Error('Não foi possível baixar cloudflared.');
const binary = Buffer.from(await response.arrayBuffer());
if ('sha256:' + createHash('sha256').update(binary).digest('hex') !== asset.digest) throw new Error('Checksum inválido.');
const directory = path.join(sessionPath, 'bin');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'cloudflared.exe'), binary);
console.log(`cloudflared ${release.tag_name} instalado com SHA256 conferido.`);
