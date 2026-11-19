export function vinculoColaboradorTeste(userId) {
  return { create: { nome: 'Colaborador de teste', cargo: 'Validação', cpf: 'teste-' + userId } };
}
