import { criarAnotacao, type Anotacao } from '../domain/anotacao';
import type { Usuario } from '../domain/usuario';

export const USUARIO_TESTE: Usuario = { id: 'u-teste', nome: 'Teste', admin: false };

let seq = 0;
/** Anotação de teste; `hora` define a ordem (HH:MM em UTC). */
export function nota(obraId: string, data: string, texto: string, hora = '12:00', autor: Usuario = USUARIO_TESTE): Anotacao {
  seq += 1;
  return criarAnotacao({ id: `n${seq}`, obraId, data, texto, autor, agora: `${data}T${hora}:00.000Z` });
}

import { Dados } from '../dados/dados';
import { criarArmazenamentoMemoria } from '../storage/memoria';
import type { Armazenamento } from '../storage/contrato';

let relogio = 0;
/** Dados em memória para testes de tela; `agora` avança 1 min a cada uso. */
export function dadosDeTeste(usuario: Usuario = USUARIO_TESTE, armazenamento: Armazenamento = criarArmazenamentoMemoria()) {
  const dados = new Dados(armazenamento, usuario, {
    agora: () => new Date(Date.UTC(2026, 10, 5, 12, relogio++)).toISOString(),
    novoId: () => `id-${++seq}`,
  });
  return { dados, armazenamento };
}
