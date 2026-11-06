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
