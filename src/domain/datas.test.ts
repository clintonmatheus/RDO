import { adicionarDias, diaDaSemana, periodoSemanal, dataLocal } from './datas';

describe('adicionarDias', () => {
  it('soma dias atravessando o mês', () => {
    expect(adicionarDias('2026-08-30', 3)).toBe('2026-09-02');
  });
  it('subtrai dias', () => {
    expect(adicionarDias('2026-08-01', -1)).toBe('2026-07-31');
  });
});

describe('diaDaSemana', () => {
  it('retorna o nome em português', () => {
    expect(diaDaSemana('2026-06-29')).toBe('segunda-feira');
    expect(diaDaSemana('2026-08-01')).toBe('sábado');
    expect(diaDaSemana('2026-10-30')).toBe('sexta-feira');
  });
  it('rejeita data inválida', () => {
    expect(() => diaDaSemana('2026-02-30')).toThrow('Data inválida');
    expect(() => diaDaSemana('29/06/2026')).toThrow('Data inválida');
  });
});

describe('periodoSemanal', () => {
  it('semana de sábado a sexta (UBS e CAPS)', () => {
    expect(periodoSemanal('2026-08-01', 'sabado')).toEqual({ inicio: '2026-08-01', fim: '2026-08-07' });
    expect(periodoSemanal('2026-08-05', 'sabado')).toEqual({ inicio: '2026-08-01', fim: '2026-08-07' });
    expect(periodoSemanal('2026-08-07', 'sabado')).toEqual({ inicio: '2026-08-01', fim: '2026-08-07' });
    expect(periodoSemanal('2026-08-08', 'sabado')).toEqual({ inicio: '2026-08-08', fim: '2026-08-14' });
  });
  it('semana de segunda a domingo (USF Rocas)', () => {
    expect(periodoSemanal('2026-08-31', 'segunda')).toEqual({ inicio: '2026-08-31', fim: '2026-09-06' });
    expect(periodoSemanal('2026-09-06', 'segunda')).toEqual({ inicio: '2026-08-31', fim: '2026-09-06' });
  });
});

describe('dataLocal', () => {
  it('converte instante UTC para a data de Natal (UTC-3)', () => {
    expect(dataLocal('2026-08-10T02:30:00.000Z')).toBe('2026-08-09');
    expect(dataLocal('2026-08-10T03:00:00.000Z')).toBe('2026-08-10');
  });
});

import { formatarDataBR } from './datas';
describe('formatarDataBR', () => {
  it('formata em dd/mm/aaaa', () => expect(formatarDataBR('2026-11-05')).toBe('05/11/2026'));
  it('rejeita data inválida', () => expect(() => formatarDataBR('2026-13-01')).toThrow('Data inválida'));
});
