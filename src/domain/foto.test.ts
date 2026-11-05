import { criarFoto, agruparFotosPorDia } from './foto';

describe('criarFoto', () => {
  it('foto da câmera do app tem data confiável e usa o horário da captura', () => {
    const f = criarFoto({
      id: 'f1', obraId: 'ubs', uri: 'file:///f1.jpg', origem: 'camera', capturadaEm: '2026-08-10T14:00:00.000Z',
    });
    expect(f.dataConfiavel).toBe(true);
    expect(f.data).toBe('2026-08-10');
    expect(f.origem).toBe('camera');
  });

  it('foto da câmera à noite cai no dia local de Natal', () => {
    const f = criarFoto({
      id: 'f2', obraId: 'ubs', uri: 'file:///f2.jpg', origem: 'camera', capturadaEm: '2026-08-11T01:00:00.000Z',
    });
    expect(f.data).toBe('2026-08-10');
  });

  it('foto da galeria com data original (EXIF) usa essa data, marcada como importada', () => {
    const f = criarFoto({
      id: 'f3', obraId: 'ubs', uri: 'file:///f3.jpg', origem: 'galeria',
      capturadaEm: '2026-08-12T15:00:00.000Z', dataOriginal: '2026-08-05T13:00:00.000Z',
    });
    expect(f.origem).toBe('galeria');
    expect(f.capturadaEm).toBe('2026-08-05T13:00:00.000Z');
    expect(f.data).toBe('2026-08-05');
    expect(f.dataConfiavel).toBe(false);
  });

  it('foto da galeria sem data original usa a data da importação e é marcada como não confiável', () => {
    const f = criarFoto({
      id: 'f4', obraId: 'ubs', uri: 'file:///f4.jpg', origem: 'galeria', capturadaEm: '2026-08-12T15:00:00.000Z',
    });
    expect(f.capturadaEm).toBe('2026-08-12T15:00:00.000Z');
    expect(f.dataConfiavel).toBe(false);
  });

  it('permite ajustar o dia manualmente para foto importada', () => {
    const f = criarFoto({
      id: 'f5', obraId: 'ubs', uri: 'file:///f5.jpg', origem: 'galeria',
      capturadaEm: '2026-08-12T15:00:00.000Z', dataManual: '2026-08-07',
    });
    expect(f.data).toBe('2026-08-07');
    expect(f.dataConfiavel).toBe(false);
  });

  it('rejeita instante inválido', () => {
    expect(() =>
      criarFoto({ id: 'x', obraId: 'ubs', uri: 'u', origem: 'camera', capturadaEm: 'ontem' }),
    ).toThrow('Data inválida');
  });
});

describe('agruparFotosPorDia', () => {
  it('agrupa por obra e dia, em ordem de captura', () => {
    const mk = (id: string, obraId: string, capturadaEm: string) =>
      criarFoto({ id, obraId, uri: id, origem: 'camera', capturadaEm });
    const grupos = agruparFotosPorDia([
      mk('b', 'ubs', '2026-08-10T16:00:00.000Z'),
      mk('a', 'ubs', '2026-08-10T12:00:00.000Z'),
      mk('c', 'ubs', '2026-08-11T12:00:00.000Z'),
      mk('d', 'caps', '2026-08-10T12:00:00.000Z'),
    ]);
    expect(grupos['ubs|2026-08-10'].map((f) => f.id)).toEqual(['a', 'b']);
    expect(grupos['ubs|2026-08-11'].map((f) => f.id)).toEqual(['c']);
    expect(grupos['caps|2026-08-10'].map((f) => f.id)).toEqual(['d']);
  });
});
