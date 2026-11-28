import { diarioCbtuHtml, montarDiarioMensal } from './cbtu';
import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import { OBRAS_INICIAIS } from '../domain/obras';
import { nota } from '../testes/fabricas';

const cbtu = OBRAS_INICIAIS[0];
const ubs = OBRAS_INICIAIS[1];

const registros = [
  criarRegistroDiario({
    obraId: cbtu.id, data: '2026-11-05', efetivo: { 'Mestre de Obra': 1, Servente: 4, Pedreiro: 3 },
    equipamentos: { Betoneira: 1 }, ritmo: 'acelerado',
  }),
  criarRegistroDiario({ obraId: cbtu.id, data: '2026-11-06', semExpediente: 'Chuva' }),
];
const anotacoes = [
  nota(cbtu.id, '2026-11-05', 'Concretagem da laje', '10:00'),
  nota(cbtu.id, '2026-11-05', 'Limpeza <geral> & entulho', '16:00'),
  nota(cbtu.id, '2026-12-01', 'outro mês'),
  nota('ubs', '2026-11-05', 'outra obra'),
];
const fotos = [
  criarFoto({ id: 'f1', obraId: cbtu.id, uri: 'u1', origem: 'camera', capturadaEm: '2026-11-05T15:00:00.000Z' }),
  criarFoto({ id: 'f2', obraId: cbtu.id, uri: 'u2', origem: 'camera', capturadaEm: '2026-12-02T15:00:00.000Z' }),
];

describe('montarDiarioMensal', () => {
  const d = montarDiarioMensal(cbtu, '2026-11-20', registros, fotos, anotacoes);

  it('cobre o mês inteiro, dia a dia', () => {
    expect(d.periodo).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(d.dias).toHaveLength(30);
  });

  it('usa apenas dados da obra e do mês', () => {
    expect(d.dias.filter((x) => x.status === 'registrado')).toHaveLength(1);
    expect(d.dias.flatMap((x) => x.fotos).map((f) => f.id)).toEqual(['f1']);
  });

  it('marca fins de semana sem registro como sem expediente', () => {
    expect(d.dias.find((x) => x.data === '2026-11-07')).toMatchObject({ status: 'sem-expediente', motivo: 'Fim de semana' });
  });

  it('recusa obra que não controla efetivo', () => {
    expect(() => montarDiarioMensal(ubs, '2026-11-20', [], [])).toThrow('Obra sem diário diário');
  });
});

describe('diarioCbtuHtml', () => {
  const d = montarDiarioMensal(cbtu, '2026-11-20', registros, fotos, anotacoes);
  const html = diarioCbtuHtml(d, (f) => `data:${f.id}`);

  it('traz cabeçalho com obra, contrato, ART e período', () => {
    expect(html).toContain('Diário de Obra');
    expect(html).toContain(cbtu.nome);
    expect(html).toContain('CTR 013-2015');
    expect(html).toContain('RN20250818940');
    expect(html).toContain('01/11/2026');
    expect(html).toContain('30/11/2026');
  });

  it('mostra efetivo por função, total, ritmo, equipamentos e anotações do dia', () => {
    expect(html).toContain('Mestre de Obra');
    expect(html).toMatch(/<td class="n">8<\/td>/); // total 1+4+3
    expect(html).toContain('acelerado');
    expect(html).toContain('Betoneira: 1');
    expect(html).toContain('Concretagem da laje');
  });

  it('escapa HTML', () => {
    expect(html).toContain('Limpeza &lt;geral&gt; &amp; entulho');
    expect(html).not.toContain('<geral>');
  });

  it('mostra dias sem expediente com o motivo', () => {
    expect(html).toContain('Sem expediente: Chuva');
    expect(html).toContain('Sem expediente: Fim de semana');
  });

  it('inclui registro fotográfico com data, só quando há fotos', () => {
    expect(html).toContain('Registro fotográfico');
    expect(html).toContain('src="data:f1"');
    const sem = diarioCbtuHtml(montarDiarioMensal(cbtu, '2026-11-20', registros, [], anotacoes), () => '');
    expect(sem).not.toContain('Registro fotográfico');
  });
});

import { montarDiarioCbtu } from './cbtu';
describe('montarDiarioCbtu (período livre)', () => {
  it('cobre um período de medição', () => {
    const d = montarDiarioCbtu(cbtu, { inicio: '2026-06-27', fim: '2026-08-31' }, [], []);
    expect(d.dias).toHaveLength(66);
    expect(d.dias[0].data).toBe('2026-06-27');
  });
  it('rejeita período invertido ou longo demais', () => {
    expect(() => montarDiarioCbtu(cbtu, { inicio: '2026-08-31', fim: '2026-06-27' }, [], [])).toThrow('Período inválido');
    expect(() => montarDiarioCbtu(cbtu, { inicio: '2025-01-01', fim: '2026-12-31' }, [], [])).toThrow('Período muito longo');
  });
});

describe('diarioCbtuHtml com dados adulterados no servidor', () => {
  // O servidor aceita qualquer JSON em "dados": um texto no lugar de um número não pode virar HTML no PDF.
  const ataque = '<img src=x onerror=alert(1)>';
  const r = criarRegistroDiario({ obraId: cbtu.id, data: '2026-11-05', efetivo: { Servente: 2 }, equipamentos: { Betoneira: 1 } });
  const adulterado = {
    ...r,
    efetivo: { ...r.efetivo, Pedreiro: ataque as unknown as number },
    equipamentos: { ...r.equipamentos, Andaime: ataque as unknown as number },
  };
  const html = diarioCbtuHtml(montarDiarioMensal(cbtu, '2026-11-20', [adulterado], []), (f) => f.uri);

  it('não insere o texto como HTML e ignora a quantidade inválida', () => {
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('onerror');
    expect(html).toMatch(/<td class="n">2<\/td>/); // total só com a quantidade válida
    expect(html).toContain('Betoneira: 1');
    expect(html).not.toContain('Andaime');
  });
});
