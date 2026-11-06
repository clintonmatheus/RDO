import { OBRAS_INICIAIS, obterObra } from './obras';

describe('obras iniciais', () => {
  it('traz as quatro obras com ids únicos', () => {
    expect(OBRAS_INICIAIS).toHaveLength(4);
    expect(new Set(OBRAS_INICIAIS.map((o) => o.id)).size).toBe(4);
  });

  it('CBTU Baraúna usa diário diário e tem ART', () => {
    const o = obterObra('cbtu-barauna');
    expect(o.tipoDiario).toBe('diario');
    expect(o.orgao).toBe('CBTU');
    expect(o.art).toBe('RN20250818940');
    expect(o.contrato).toBe('CTR 013-2015');
  });

  it('UBS e CAPS usam diário semanal de sábado a sexta', () => {
    for (const id of ['ubs', 'caps']) {
      const o = obterObra(id);
      expect(o.tipoDiario).toBe('semanal');
      expect(o.inicioSemana).toBe('sabado');
      expect(o.orgao).toBe('SEINFRA');
    }
  });

  it('USF Rocas usa diário semanal de segunda a domingo', () => {
    const o = obterObra('usf-rocas');
    expect(o.tipoDiario).toBe('semanal');
    expect(o.inicioSemana).toBe('segunda');
  });

  it('lança erro para obra inexistente', () => {
    expect(() => obterObra('nao-existe')).toThrow('Obra não encontrada');
  });
});

describe('controle de efetivo', () => {
  it('só a obra do CBTU controla efetivo, equipamentos e ritmo', () => {
    expect(OBRAS_INICIAIS.filter((o) => o.controlaEfetivo).map((o) => o.id)).toEqual(['cbtu-barauna']);
  });
});
