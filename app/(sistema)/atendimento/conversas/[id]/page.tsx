import { notFound, redirect } from 'next/navigation';
import { acessoConversa } from '@/lib/whatsapp/acesso';

export default async function PaginaConversa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await acessoConversa(id)) notFound();
  redirect('/atendimento?cliente=' + encodeURIComponent(id));
}
