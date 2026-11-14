export interface FotoResumo {
  id: string;
  updatedAt: Date | string;
}

export function urlFoto(foto: FotoResumo) {
  return `/api/fotos/${encodeURIComponent(foto.id)}?v=${new Date(foto.updatedAt).getTime()}`;
}
