import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegistroDiaTela } from './RegistroDiaTela';
import { RepositorioFotosMemoria, RepositorioRegistrosMemoria } from '../storage/memoria';
import { criarRegistroDiario } from '../domain/registro';
import { OBRAS_INICIAIS } from '../domain/obras';

const obra = OBRAS_INICIAIS[0];
const data = '2026-11-05';

async function abrir(repo = new RepositorioRegistrosMemoria()) {
  const onVoltar = jest.fn();
  await render(<RegistroDiaTela obra={obra} data={data} hoje={data} repositorio={repo} fotos={new RepositorioFotosMemoria()}
    servicoFotos={{ tirarFoto: async () => undefined, escolherDaGaleria: async () => undefined }} onVoltar={onVoltar} />);
  return { repo, onVoltar };
}

describe('RegistroDiaTela', () => {
  it('mostra obra, data e total de efetivo zerado', async () => {
    await abrir();
    expect(screen.getByText(obra.nome)).toBeTruthy();
    expect(screen.getByText('05/11/2026')).toBeTruthy();
    expect(screen.getByTestId('total-efetivo')).toHaveTextContent('Total: 0');
  });

  it('soma e subtrai efetivo, sem ficar negativo', async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('mais-Pedreiro'));
    expect(screen.getByTestId('qtd-Servente')).toHaveTextContent('2');
    expect(screen.getByTestId('total-efetivo')).toHaveTextContent('Total: 3');
    await fireEvent.press(screen.getByTestId('menos-Pedreiro'));
    await fireEvent.press(screen.getByTestId('menos-Pedreiro'));
    expect(screen.getByTestId('qtd-Pedreiro')).toHaveTextContent('0');
  });

  it('salva o registro do dia com efetivo, ritmo e anotações', async () => {
    const { repo, onVoltar } = await abrir();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('mais-Betoneira'));
    await fireEvent.press(screen.getByTestId('ritmo-acelerado'));
    await fireEvent.changeText(screen.getByTestId('anotacoes'), 'Concretagem da laje\nLimpeza');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await repo.obter(obra.id, data);
    expect(r?.efetivo.Servente).toBe(1);
    expect(r?.equipamentos.Betoneira).toBe(1);
    expect(r?.ritmo).toBe('acelerado');
    expect(r?.anotacoes).toEqual(['Concretagem da laje', 'Limpeza']);
  });

  it('carrega registro existente para edição', async () => {
    const repo = new RepositorioRegistrosMemoria();
    await repo.salvar(criarRegistroDiario({ obraId: obra.id, data, efetivo: { Pedreiro: 4 }, anotacoes: ['Reboco'] }));
    await abrir(repo);
    await waitFor(() => expect(screen.getByTestId('qtd-Pedreiro')).toHaveTextContent('4'));
    expect(screen.getByTestId('anotacoes').props.value).toBe('Reboco');
  });

  it('dia sem expediente exige motivo e zera o efetivo', async () => {
    const { repo, onVoltar } = await abrir();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('sem-expediente'));
    await fireEvent.press(screen.getByTestId('salvar'));
    expect(screen.getByText('Informe o motivo')).toBeTruthy();
    expect(onVoltar).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('motivo'), 'Chuva');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await repo.obter(obra.id, data);
    expect(r?.semExpediente).toEqual({ motivo: 'Chuva' });
    expect(r?.efetivo.Servente).toBe(0);
  });
});

describe('RegistroDiaTela — ajustes', () => {
  const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
  const semFotos = { tirarFoto: async () => undefined, escolherDaGaleria: async () => undefined };

  async function abrirObra(o: typeof ubs, dia: string, repo = new RepositorioRegistrosMemoria()) {
    const onVoltar = jest.fn();
    await render(<RegistroDiaTela obra={o} data={dia} hoje={dia} repositorio={repo} fotos={new RepositorioFotosMemoria()}
      servicoFotos={semFotos} onVoltar={onVoltar} />);
    return { repo, onVoltar };
  }

  it('rótulo das anotações não tem "(uma por linha)"', async () => {
    await abrirObra(ubs, '2026-11-05');
    expect(screen.getByText('Anotações')).toBeTruthy();
    expect(screen.queryByText(/uma por linha/)).toBeNull();
  });

  it('obra fora do CBTU mostra só anotações e fotos', async () => {
    await abrirObra(ubs, '2026-11-05');
    expect(screen.queryByTestId('mais-Servente')).toBeNull();
    expect(screen.queryByTestId('mais-Betoneira')).toBeNull();
    expect(screen.queryByTestId('ritmo-normal')).toBeNull();
    expect(screen.getByTestId('anotacoes')).toBeTruthy();
    expect(screen.getByTestId('foto-galeria')).toBeTruthy();
  });

  it('obra fora do CBTU salva só as anotações', async () => {
    const { repo, onVoltar } = await abrirObra(ubs, '2026-11-05');
    await fireEvent.changeText(screen.getByTestId('anotacoes'), 'Reboco interno');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await repo.obter('ubs', '2026-11-05');
    expect(r?.anotacoes).toEqual(['Reboco interno']);
    expect(r?.semExpediente).toBeUndefined();
  });

  it('sábado vem como dia sem expediente, motivo "Fim de semana"', async () => {
    const { repo, onVoltar } = await abrirObra(ubs, '2026-11-07');
    expect(screen.getByTestId('motivo').props.value).toBe('Fim de semana');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    expect((await repo.obter('ubs', '2026-11-07'))?.semExpediente).toEqual({ motivo: 'Fim de semana' });
  });

  it('encarregado pode desmarcar o padrão e registrar trabalho no sábado', async () => {
    const { repo, onVoltar } = await abrirObra(ubs, '2026-11-07');
    await fireEvent.press(screen.getByTestId('sem-expediente'));
    expect(screen.queryByTestId('motivo')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('anotacoes'), 'Concretagem');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await repo.obter('ubs', '2026-11-07');
    expect(r?.semExpediente).toBeUndefined();
    expect(r?.anotacoes).toEqual(['Concretagem']);
  });

  it('registro já salvo num sábado de trabalho não volta a ser fim de semana', async () => {
    const repo = new RepositorioRegistrosMemoria();
    await repo.salvar(criarRegistroDiario({ obraId: 'ubs', data: '2026-11-07', anotacoes: ['Trabalho'] }));
    await abrirObra(ubs, '2026-11-07', repo);
    await waitFor(() => expect(screen.getByTestId('anotacoes').props.value).toBe('Trabalho'));
    expect(screen.queryByTestId('motivo')).toBeNull();
  });
});
