'use server';

import { exigirUsuario } from '@/lib/autorizacao';
import { chamarWhatsApp } from '@/lib/whatsapp/bridge';

export async function conectarWhatsApp() {
  await exigirUsuario(['ADMIN']);
  try {
    await chamarWhatsApp('connect');
    return { sucesso: true, mensagem: '' };
  } catch { return { sucesso: false, mensagem: 'Não foi possível iniciar. Verifique se o serviço do WhatsApp está em execução.' }; }
}

export async function desconectarWhatsApp() {
  await exigirUsuario(['ADMIN']);
  try {
    await chamarWhatsApp('disconnect');
    return { sucesso: true, mensagem: '' };
  } catch { return { sucesso: false, mensagem: 'Não foi possível desconectar. Tente novamente ou remova o aparelho pelo celular.' }; }
}
