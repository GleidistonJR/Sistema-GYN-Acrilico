import { IdCard, QrCode, MapPin, Clock, Package, MessageSquareText } from 'lucide-react';

export type TextoRapido = { id: string; label: string; texto: string };

const icones = new Map([
  ['cadastro', IdCard], ['pix', QrCode], ['endereco', MapPin],
  ['horario', Clock], ['condicoes', Package], ['aprovacao', Package],
]);

export function iconeTextoRapido(id: string) {
  return icones.get(id) ?? MessageSquareText;
}
