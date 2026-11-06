import { anotacoesVisiveis, criarAnotacao, editarAnotacao, excluirAnotacao, podeAlterar } from './anotacao';
import type { Usuario } from './usuario';

const ana: Usuario = { id: 'u-ana', nome: 'Ana', admin: false };
const beto: Usuario = { id: 'u-beto', nome: 'Beto', admin: false };
const adm: Usuario = { id: 'u-adm', nome: 'Clinton', admin: true };
const T1 = '2026-11-06T12:00:00.000Z';
const T2 = '2026-11-06T13:00:00.000Z';

const nova = (texto = 'Concretagem da laje') =>
  criarAnotacao({ id: 'a1', obraId: 'ubs', data: '2026-11-06', texto, autor: ana, agora: T1 });

describe('criarAnotacao', () => {
  it('registra autor, horário e texto sem espaços extras', () => {
    const a = nova('  Concretagem da laje  ');
    expect(a).toEqual({
      id: 'a1', obraId: 'ubs', data: '2026-11-06', texto: 'Concretagem da laje',
      autorId: 'u-ana', autorNome: 'Ana', criadaEm: T1, atualizadaEm: T1, excluida: false,
    });
  });
  it('rejeita texto vazio e data inválida', () => {
    expect(() => nova('   ')).toThrow('Anotação vazia');
    expect(() => criarAnotacao({ id: 'x', obraId: 'ubs', data: '2026-02-30', texto: 'a', autor: ana, agora: T1 })).toThrow('Data inválida');
  });
});

describe('permissões', () => {
  it('só o autor e o administrador podem alterar', () => {
    const a = nova();
    expect(podeAlterar(ana, a)).toBe(true);
    expect(podeAlterar(adm, a)).toBe(true);
    expect(podeAlterar(beto, a)).toBe(false);
  });

  it('editar atualiza texto e horário; terceiros são bloqueados', () => {
    const a = editarAnotacao(nova(), ' Laje concretada ', adm, T2);
    expect(a.texto).toBe('Laje concretada');
    expect(a.atualizadaEm).toBe(T2);
    expect(a.autorNome).toBe('Ana');
    expect(() => editarAnotacao(nova(), 'x', beto, T2)).toThrow('Sem permissão');
    expect(() => editarAnotacao(nova(), '  ', ana, T2)).toThrow('Anotação vazia');
  });

  it('excluir marca como excluída (para sincronizar) e respeita permissão', () => {
    const a = excluirAnotacao(nova(), ana, T2);
    expect(a.excluida).toBe(true);
    expect(a.atualizadaEm).toBe(T2);
    expect(() => excluirAnotacao(nova(), beto, T2)).toThrow('Sem permissão');
  });
});

describe('anotacoesVisiveis', () => {
  it('omite excluídas e ordena por horário de criação', () => {
    const a = criarAnotacao({ id: 'a', obraId: 'ubs', data: '2026-11-06', texto: 'segunda', autor: ana, agora: T2 });
    const b = criarAnotacao({ id: 'b', obraId: 'ubs', data: '2026-11-06', texto: 'primeira', autor: beto, agora: T1 });
    const c = excluirAnotacao(criarAnotacao({ id: 'c', obraId: 'ubs', data: '2026-11-06', texto: 'x', autor: ana, agora: T1 }), ana, T2);
    expect(anotacoesVisiveis([a, b, c]).map((x) => x.texto)).toEqual(['primeira', 'segunda']);
  });
});
