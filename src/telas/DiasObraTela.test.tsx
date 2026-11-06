import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiasObraTela } from './DiasObraTela';
import { RepositorioFotosMemoria, RepositorioRegistrosMemoria } from '../storage/memoria';
import { criarRegistroDiario } from '../domain/registro';
import { criarFoto } from '../domain/foto';
import { OBRAS_INICIAIS } from '../domain/obras';

const obra = OBRAS_INICIAIS[0];

async function abrir(onAbrir = jest.fn()) {
  const registros = new RepositorioRegistrosMemoria();
  const fotos = new RepositorioFotosMemoria();
  await registros.salvar(criarRegistroDiario({ obraId: obra.id, data: '2026-11-04', efetivo: { Servente: 2 } }));
  await registros.salvar(criarRegistroDiario({ obraId: obra.id, data: '2026-11-03', semExpediente: 'Chuva' }));
  await fotos.salvar(criarFoto({ id: 'f1', obraId: obra.id, uri: 'u', origem: 'camera', capturadaEm: '2026-11-04T15:00:00.000Z' }));
  await render(<DiasObraTela obra={obra} hoje="2026-11-05" registros={registros} fotos={fotos} gerarPdf={async () => {}} onAbrir={onAbrir} onVoltar={() => {}} />);
  return onAbrir;
}

describe('DiasObraTela', () => {
  it('lista 14 dias começando por hoje', async () => {
    await abrir();
    const dias = await screen.findAllByTestId('dia-item');
    expect(dias).toHaveLength(14);
    expect(screen.getByTestId('dia-2026-11-05')).toBeTruthy();
    expect(screen.getByTestId('dia-2026-10-23')).toBeTruthy();
  });

  it('mostra o status de cada dia', async () => {
    await abrir();
    expect(await screen.findByTestId('status-2026-11-05')).toHaveTextContent('Sem registro');
    expect(screen.getByTestId('status-2026-11-04')).toHaveTextContent('Registrado · 2 no efetivo · 1 foto');
    expect(screen.getByTestId('status-2026-11-03')).toHaveTextContent('Sem expediente: Chuva');
  });

  it('abre o dia tocado', async () => {
    const onAbrir = await abrir();
    await fireEvent.press(await screen.findByTestId('dia-2026-11-04'));
    expect(onAbrir).toHaveBeenCalledWith('2026-11-04');
  });
});

describe('DiasObraTela — diário semanal', () => {
  const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;

  async function abrirObra(o: typeof ubs, gerarPdf = jest.fn(async () => {})) {
    await render(
      <DiasObraTela obra={o} hoje="2026-11-05" registros={new RepositorioRegistrosMemoria()} fotos={new RepositorioFotosMemoria()}
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
    expect(await screen.findByTestId('status-2026-11-01')).toHaveTextContent('Sem expediente: Fim de semana');
  });

  it('obra fora do CBTU não mostra efetivo no status', async () => {
    const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
    const registros = new RepositorioRegistrosMemoria();
    await registros.salvar(criarRegistroDiario({ obraId: 'ubs', data: '2026-11-04', anotacoes: ['x'] }));
    await render(<DiasObraTela obra={ubs} hoje="2026-11-05" registros={registros} fotos={new RepositorioFotosMemoria()}
      gerarPdf={async () => {}} onAbrir={() => {}} onVoltar={() => {}} />);
    expect(await screen.findByTestId('status-2026-11-04')).toHaveTextContent('Registrado');
    expect(screen.getByTestId('status-2026-11-04')).not.toHaveTextContent('efetivo');
  });
});

describe('DiasObraTela — diário mensal do CBTU', () => {
  async function abrirObra(o: (typeof OBRAS_INICIAIS)[number], gerarPdf = jest.fn(async () => {})) {
    await render(
      <DiasObraTela obra={o} hoje="2026-11-05" registros={new RepositorioRegistrosMemoria()} fotos={new RepositorioFotosMemoria()}
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
      <DiasObraTela obra={o} hoje="2026-11-05" registros={new RepositorioRegistrosMemoria()} fotos={new RepositorioFotosMemoria()}
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
