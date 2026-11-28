import { anotacaoValida, fotoValida, idSeguro, registroValido } from './validar';

describe('validação do que vem do servidor', () => {
  it('aceita o formato do app', () => {
    expect(registroValido({ obraId: 'ubs', data: '2026-11-06', efetivo: {}, equipamentos: {} })).toBe(true);
    expect(anotacaoValida({ id: 'lx1-a', obraId: 'ubs', data: '2026-11-06', texto: 't', autorId: 'u', autorNome: 'Ana', criadaEm: 'x' })).toBe(true);
    expect(fotoValida({ id: 'lx1-a', obraId: 'ubs', data: '2026-11-06', capturadaEm: 'x' })).toBe(true);
  });
  it('recusa o que travaria outro aparelho', () => {
    expect(registroValido({})).toBe(false);
    expect(anotacaoValida({ id: 'a', obraId: 'ubs', data: '2026-11-06', texto: 't', autorId: 'u', autorNome: 'A' })).toBe(false);
    expect(fotoValida({ id: 'x/../y', obraId: 'ubs', data: '2026-11-06', capturadaEm: 'x' })).toBe(false);
    expect(idSeguro('../databases/rdo')).toBe(false);
  });
});
