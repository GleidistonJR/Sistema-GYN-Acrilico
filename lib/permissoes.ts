export const PERFIS_ATENDIMENTO = ['ADMIN', 'USER', 'RECEPCAO'] as const;
export const PERFIS_CHAT_INTERNO = ['ADMIN', 'USER'] as const;
export const PERFIS_COMERCIAIS = [...PERFIS_ATENDIMENTO, 'COMERCIAL'] as const;
export const PERFIS_REGISTRO_PONTO = ['PONTO', 'OUTRO'] as const;
export const PERFIS_RELATORIO_PONTO = ['ADMIN', ...PERFIS_REGISTRO_PONTO] as const;
export const PERFIS_AVULSOS = ['PONTO', 'COMERCIAL', 'RECEPCAO'] as const;
export type PerfilAvulso = (typeof PERFIS_AVULSOS)[number];

export const ESCOPOS_AVULSOS: Record<PerfilAvulso, string> = {
  PONTO: 'Ponto e relatórios',
  COMERCIAL: 'Orçamentos, materiais e produtos',
  RECEPCAO: 'Recepção — Atendimento, Orçamentos, Materiais e Produtos',
};

export function permite(perfis: readonly string[], role: string | undefined) {
  return role !== undefined && perfis.includes(role);
}

export function ehPerfilAvulso(role: string): role is PerfilAvulso {
  return permite(PERFIS_AVULSOS, role);
}
