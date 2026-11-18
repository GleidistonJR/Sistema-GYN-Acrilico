import Link from 'next/link';
import { exigirUsuario } from '@/lib/autorizacao';
import PainelConexao from './PainelConexao';

export default async function ConexaoWhatsApp() {
  await exigirUsuario(['ADMIN']);
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/atendimento" className="text-sm font-semibold text-slate-500 hover:text-slate-900">← Voltar ao atendimento</Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-emerald-700">Canal da empresa</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Conectar WhatsApp</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Vincule o WhatsApp da empresa escaneando o QR Code com seu celular.</p>
      <PainelConexao />
    </div>
  </main>;
}
