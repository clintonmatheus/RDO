import { criarRegistroDiario, totalEfetivo, EFETIVO_VAZIO } from './registro';

const base = { obraId: 'cbtu-barauna', data: '2026-06-29' };

describe('criarRegistroDiario', () => {
  it('cria registro com efetivo zerado e ritmo normal', () => {
    const r = criarRegistroDiario(base);
    expect(r.efetivo).toEqual(EFETIVO_VAZIO);
    expect(r.ritmo).toBe('normal');
    expect('anotacoes' in r).toBe(false);
    expect(r.semExpediente).toBeUndefined();
  });

  it('aceita efetivo e equipamentos informados', () => {
    const r = criarRegistroDiario({
      ...base,
      efetivo: { 'Mestre de Obra': 1, Servente: 5, Pedreiro: 4 },
      equipamentos: { Betoneira: 1 },
    });
    expect(totalEfetivo(r)).toBe(10);
    expect(r.equipamentos.Betoneira).toBe(1);
  });

  it('registra quem alterou e quando', () => {
    const r = criarRegistroDiario({ ...base, autor: { id: 'u1', nome: 'Ana', admin: false }, agora: '2026-11-06T12:00:00.000Z' });
    expect(r.atualizadoPor).toEqual({ id: 'u1', nome: 'Ana' });
    expect(r.atualizadoEm).toBe('2026-11-06T12:00:00.000Z');
  });

  it('rejeita quantidade negativa ou fracionada', () => {
    expect(() => criarRegistroDiario({ ...base, efetivo: { Servente: -1 } })).toThrow('Quantidade inválida');
    expect(() => criarRegistroDiario({ ...base, efetivo: { Servente: 1.5 } })).toThrow('Quantidade inválida');
  });

  it('rejeita data inválida', () => {
    expect(() => criarRegistroDiario({ ...base, data: '2026-13-01' })).toThrow('Data inválida');
  });

  it('dia sem expediente exige motivo e zera efetivo', () => {
    const r = criarRegistroDiario({ ...base, data: '2026-04-21', semExpediente: 'Feriado' });
    expect(r.semExpediente).toEqual({ motivo: 'Feriado' });
    expect(totalEfetivo(r)).toBe(0);
  });

  it('dia sem expediente não aceita efetivo', () => {
    expect(() =>
      criarRegistroDiario({ ...base, semExpediente: 'Feriado', efetivo: { Servente: 2 } }),
    ).toThrow('Dia sem expediente não pode ter efetivo');
  });

  it('dia sem expediente com motivo vazio é rejeitado', () => {
    expect(() => criarRegistroDiario({ ...base, semExpediente: '  ' })).toThrow('Informe o motivo');
  });
});
