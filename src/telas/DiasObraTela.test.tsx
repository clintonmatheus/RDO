import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiasObraTela } from './DiasObraTela';
import { criarArmazenamentoMemoria } from '../storage/memoria';
import { dadosDeTeste, nota } from '../testes/fabricas';
import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import { OBRAS_INICIAIS } from '../domain/obras';

const obra = OBRAS_INICIAIS[0];

async function abrir(onAbrir = jest.fn()) {
  const a = criarArmazenamentoMemoria();
  await a.registros.salvar(criarRegistroDiario({ obraId: obra.id, data: '2026-11-04', efetivo: { Servente: 2 } }));
  await a.registros.salvar(criarRegistroDiario({ obraId: obra.id, data: '2026-11-03', semExpediente: 'Chuva' }));
  await a.fotos.salvar(criarFoto({ id: 'f1', obraId: obra.id, uri: 'u', origem: 'camera', capturadaEm: '2026-11-04T15:00:00.000Z' }));
  await a.anotacoes.salvar(nota(obra.id, '2026-11-02', 'Só anotação'));
  await render(<DiasObraTela obra={obra} hoje="2026-11-05" dados={dadosDeTeste(undefined, a).dados} gerarPdf={async () => {}} onAbrir={onAbrir} onVoltar={() => {}} />);
  return onAbrir;
}

describe('DiasObraTela', () => {
  const rotulo = (d: string) => screen.getByTestId(`dia-${d}`).props.accessibilityLabel as string;

  it('mostra o mês de hoje em forma de calendário', async () => {
    await abrir();
    expect(await screen.findAllByTestId('dia-item')).toHaveLength(30);
    expect(screen.getByTestId('mes-rotulo')).toHaveTextContent('novembro de 2026');
    for (const d of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) expect(screen.getByText(d)).toBeTruthy();
    expect(screen.getByTestId('dia-2026-11-01')).toBeTruthy();
    expect(screen.getByTestId('dia-2026-11-30')).toBeTruthy();
  });

  it('indica o status de cada dia', async () => {
    await abrir();
    await screen.findAllByTestId('dia-item');
    expect(rotulo('2026-11-05')).toContain('Sem registro');
    expect(rotulo('2026-11-04')).toContain('Registrado · 2 no efetivo · 1 foto');
    expect(rotulo('2026-11-03')).toContain('Sem expediente: Chuva');
    expect(rotulo('2026-11-02')).toContain('Registrado');
  });

  it('abre o dia tocado', async () => {
    const onAbrir = await abrir();
    await fireEvent.press(await screen.findByTestId('dia-2026-11-04'));
    expect(onAbrir).toHaveBeenCalledWith('2026-11-04');
  });

  it('dias futuros não abrem', async () => {
    const onAbrir = await abrir();
    await fireEvent.press(await screen.findByTestId('dia-2026-11-06'));
    expect(onAbrir).not.toHaveBeenCalled();
  });

  it('navega para o mês anterior e não avança além do mês atual', async () => {
    await abrir();
    await screen.findAllByTestId('dia-item');
    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByTestId('mes-rotulo')).toHaveTextContent('outubro de 2026');
    expect(await screen.findAllByTestId('dia-item')).toHaveLength(31);
    await fireEvent.press(screen.getByTestId('mes-proximo'));
    expect(screen.getByTestId('mes-rotulo')).toHaveTextContent('novembro de 2026');
    await fireEvent.press(screen.getByTestId('mes-proximo'));
    expect(screen.getByTestId('mes-rotulo')).toHaveTextContent('novembro de 2026');
  });
});

describe('DiasObraTela — diário semanal', () => {
  const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;

  async function abrirObra(o: typeof ubs, gerarPdf = jest.fn(async () => {})) {
    await render(
      <DiasObraTela obra={o} hoje="2026-11-05" dados={dadosDeTeste().dados}
        gerarPdf={gerarPdf} onAbrir={() => {}} onVoltar={() => {}} />,
    );
    return gerarPdf;
  }

  it('gera o PDF da semana atual em obra de diário semanal', async () => {
    const gerar = await abrirObra(ubs);
    await fireEvent.press(await screen.findByTestId('gerar-semanal'));
    expect(gerar).toHaveBeenCalledTimes(1);
    const diario = (gerar.mock.calls[0] as any[])[0];
    expect(diario.periodo).toEqual({ inicio: '2026-10-31', fim: '2026-11-06' });
  });

  it('não oferece o botão em obra de diário diário', async () => {
    await abrirObra(OBRAS_INICIAIS[0]);
    await screen.findAllByTestId('dia-item');
    expect(screen.queryByTestId('gerar-semanal')).toBeNull();
  });
});

describe('DiasObraTela — ajustes', () => {
  it('fim de semana sem registro aparece como sem expediente', async () => {
    await abrir();
    await screen.findAllByTestId('dia-item');
    expect(screen.getByTestId('dia-2026-11-01').props.accessibilityLabel).toContain('Sem expediente: Fim de semana');
  });

  it('obra fora do CBTU não mostra efetivo no status', async () => {
    const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
    const a = criarArmazenamentoMemoria();
    await a.registros.salvar(criarRegistroDiario({ obraId: 'ubs', data: '2026-11-04' }));
    await render(<DiasObraTela obra={ubs} hoje="2026-11-05" dados={dadosDeTeste(undefined, a).dados}
      gerarPdf={async () => {}} onAbrir={() => {}} onVoltar={() => {}} />);
    await screen.findAllByTestId('dia-item');
    const r = screen.getByTestId('dia-2026-11-04').props.accessibilityLabel as string;
    expect(r).toContain('Registrado');
    expect(r).not.toContain('efetivo');
  });
});

describe('DiasObraTela — diário mensal do CBTU', () => {
  async function abrirObra(o: (typeof OBRAS_INICIAIS)[number], gerarPdf = jest.fn(async () => {})) {
    await render(
      <DiasObraTela obra={o} hoje="2026-11-05" dados={dadosDeTeste().dados}
        gerarPdf={gerarPdf} onAbrir={() => {}} onVoltar={() => {}} />,
    );
    return gerarPdf;
  }

  it('gera o PDF do mês atual na obra do CBTU', async () => {
    const gerar = await abrirObra(OBRAS_INICIAIS[0]);
    await fireEvent.press(await screen.findByTestId('gerar-mensal'));
    expect(gerar).toHaveBeenCalledTimes(1);
    expect((gerar.mock.calls[0] as any[])[0].periodo).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(screen.queryByTestId('gerar-semanal')).toBeNull();
  });

  it('obra semanal não mostra o botão mensal', async () => {
    await abrirObra(OBRAS_INICIAIS[1]);
    await screen.findByTestId('gerar-semanal');
    expect(screen.queryByTestId('gerar-mensal')).toBeNull();
  });
});

describe('DiasObraTela — escolha de período', () => {
  const cbtuObra = OBRAS_INICIAIS[0];
  const ubsObra = OBRAS_INICIAIS[1];

  async function abrirObra(o: typeof cbtuObra, gerarPdf = jest.fn(async () => {})) {
    await render(
      <DiasObraTela obra={o} hoje="2026-11-05" dados={dadosDeTeste().dados}
        gerarPdf={gerarPdf} onAbrir={() => {}} onVoltar={() => {}} />,
    );
    return gerarPdf;
  }
  const periodoGerado = (g: jest.Mock) => (g.mock.calls[0] as any[])[0].periodo;

  it('CBTU: período inicia no mês atual', async () => {
    await abrirObra(cbtuObra);
    expect((await screen.findByTestId('periodo-de')).props.value).toBe('01/11/2026');
    expect(screen.getByTestId('periodo-ate').props.value).toBe('30/11/2026');
  });

  it('CBTU: botão anterior gera o mês anterior', async () => {
    const g = await abrirObra(cbtuObra);
    await fireEvent.press(await screen.findByTestId('periodo-anterior'));
    expect(screen.getByTestId('periodo-de').props.value).toBe('01/10/2026');
    await fireEvent.press(screen.getByTestId('gerar-mensal'));
    expect(periodoGerado(g)).toEqual({ inicio: '2026-10-01', fim: '2026-10-31' });
  });

  it('CBTU: período personalizado de medição', async () => {
    const g = await abrirObra(cbtuObra);
    await fireEvent.changeText(await screen.findByTestId('periodo-de'), '27/06/2026');
    await fireEvent.changeText(screen.getByTestId('periodo-ate'), '31/08/2026');
    await fireEvent.press(screen.getByTestId('gerar-mensal'));
    expect(periodoGerado(g)).toEqual({ inicio: '2026-06-27', fim: '2026-08-31' });
  });

  it('CBTU: data inválida ou período invertido não gera PDF', async () => {
    const g = await abrirObra(cbtuObra);
    await fireEvent.changeText(await screen.findByTestId('periodo-de'), 'abc');
    await fireEvent.press(screen.getByTestId('gerar-mensal'));
    expect(screen.getByText('Data inválida')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('periodo-de'), '10/11/2026');
    await fireEvent.changeText(screen.getByTestId('periodo-ate'), '01/11/2026');
    await fireEvent.press(screen.getByTestId('gerar-mensal'));
    expect(screen.getByText('Período inválido')).toBeTruthy();
    expect(g).not.toHaveBeenCalled();
  });

  it('semanal: navega entre semanas e gera a semana mostrada', async () => {
    const g = await abrirObra(ubsObra);
    expect(await screen.findByTestId('periodo-rotulo')).toHaveTextContent('31/10/2026 a 06/11/2026');
    await fireEvent.press(screen.getByTestId('periodo-anterior'));
    expect(screen.getByTestId('periodo-rotulo')).toHaveTextContent('24/10/2026 a 30/10/2026');
    await fireEvent.press(screen.getByTestId('gerar-semanal'));
    expect(periodoGerado(g)).toEqual({ inicio: '2026-10-24', fim: '2026-10-30' });
    expect(screen.queryByTestId('periodo-de')).toBeNull();
  });
});

describe('DiasObraTela — anotações no PDF', () => {
  it('o PDF inclui as anotações do período', async () => {
    const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
    const a = criarArmazenamentoMemoria();
    await a.anotacoes.salvar(nota('ubs', '2026-11-03', 'Reboco interno'));
    const gerar = jest.fn(async () => {});
    await render(<DiasObraTela obra={ubs} hoje="2026-11-05" dados={dadosDeTeste(undefined, a).dados} gerarPdf={gerar} onAbrir={() => {}} onVoltar={() => {}} />);
    await fireEvent.press(await screen.findByTestId('gerar-semanal'));
    const diario = (gerar.mock.calls[0] as any[])[0];
    expect(diario.dias.find((d: any) => d.data === '2026-11-03').anotacoes).toEqual(['Reboco interno']);
  });
});

describe('DiasObraTela — exportar fotos', () => {
  const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
  async function abrirComFotos(exportarFotos = jest.fn(async () => {})) {
    const a = criarArmazenamentoMemoria();
    await a.fotos.salvar(criarFoto({ id: 'f2', obraId: 'ubs', uri: 'u2', origem: 'camera', capturadaEm: '2026-11-04T15:00:00.000Z' }));
    await a.fotos.salvar(criarFoto({ id: 'f1', obraId: 'ubs', uri: 'u1', origem: 'camera', capturadaEm: '2026-11-02T15:00:00.000Z' }));
    await a.fotos.salvar(criarFoto({ id: 'out', obraId: 'ubs', uri: 'u3', origem: 'camera', capturadaEm: '2026-10-20T15:00:00.000Z' }));
    await render(<DiasObraTela obra={ubs} hoje="2026-11-05" dados={dadosDeTeste(undefined, a).dados} gerarPdf={async () => {}}
      exportarFotos={exportarFotos} onAbrir={() => {}} onVoltar={() => {}} />);
    return exportarFotos;
  }

  it('exporta as fotos do período, por padrão o mês atual', async () => {
    const g = await abrirComFotos();
    expect((await screen.findByTestId('fotos-de')).props.value).toBe('01/11/2026');
    expect(screen.getByTestId('fotos-ate').props.value).toBe('30/11/2026');
    await fireEvent.press(screen.getByTestId('exportar-fotos'));
    const arg = (g.mock.calls[0] as any[])[0];
    expect(arg.obra.id).toBe('ubs');
    expect(arg.periodo).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(arg.fotos.map((f: any) => f.id)).toEqual(['f1', 'f2']);
  });

  it('avisa quando não há fotos no período', async () => {
    const g = await abrirComFotos();
    await fireEvent.changeText(await screen.findByTestId('fotos-de'), '01/09/2026');
    await fireEvent.changeText(screen.getByTestId('fotos-ate'), '30/09/2026');
    await fireEvent.press(screen.getByTestId('exportar-fotos'));
    expect(await screen.findByText('Nenhuma foto no período')).toBeTruthy();
    expect(g).not.toHaveBeenCalled();
  });
});
