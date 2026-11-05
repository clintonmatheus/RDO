import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegistroDiaTela } from './RegistroDiaTela';
import { RepositorioFotosMemoria, RepositorioRegistrosMemoria } from '../storage/memoria';
import type { ServicoFotos } from '../fotos/servico';
import { OBRAS_INICIAIS } from '../domain/obras';

const obra = OBRAS_INICIAIS[0];

function servicoFalso(): ServicoFotos {
  return {
    tirarFoto: jest.fn(async () => ({ uri: 'file://cam.jpg', capturadaEm: '2026-11-05T15:00:00.000Z' })),
    escolherDaGaleria: jest.fn(async () => ({ uri: 'file://gal.jpg', capturadaEm: '2026-11-01T12:00:00.000Z' })),
  };
}

async function abrir(data: string, servico = servicoFalso()) {
  const fotos = new RepositorioFotosMemoria();
  await render(
    <RegistroDiaTela obra={obra} data={data} hoje="2026-11-05" repositorio={new RepositorioRegistrosMemoria()}
      fotos={fotos} servicoFotos={servico} onVoltar={() => {}} />,
  );
  return { fotos, servico };
}

describe('Fotos do dia', () => {
  it('foto da câmera é salva no dia da captura e aparece na tela', async () => {
    const { fotos } = await abrir('2026-11-05');
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    const [f] = await fotos.listarPorDia(obra.id, '2026-11-05');
    expect(f.origem).toBe('camera');
    expect(f.dataConfiavel).toBe(true);
  });

  it('só oferece a câmera no dia de hoje', async () => {
    await abrir('2026-11-04');
    expect(screen.queryByTestId('tirar-foto')).toBeNull();
    expect(screen.getByTestId('foto-galeria')).toBeTruthy();
  });

  it('foto da galeria pertence ao dia aberto, mesmo com data original diferente', async () => {
    const { fotos } = await abrir('2026-11-04');
    await fireEvent.press(screen.getByTestId('foto-galeria'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    const [f] = await fotos.listarPorDia(obra.id, '2026-11-04');
    expect(f.origem).toBe('galeria');
    expect(f.dataConfiavel).toBe(false);
    expect(f.capturadaEm).toBe('2026-11-01T12:00:00.000Z');
  });

  it('cancelar a captura não salva nada', async () => {
    const servico = servicoFalso();
    (servico.tirarFoto as jest.Mock).mockResolvedValue(undefined);
    const { fotos } = await abrir('2026-11-05', servico);
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(servico.tirarFoto).toHaveBeenCalled());
    expect(await fotos.listarPorObra(obra.id)).toHaveLength(0);
  });

  it('remove uma foto', async () => {
    const { fotos } = await abrir('2026-11-05');
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    await fireEvent.press(screen.getByTestId('remover-foto'));
    await waitFor(() => expect(screen.queryAllByTestId('foto-item')).toHaveLength(0));
    expect(await fotos.listarPorObra(obra.id)).toHaveLength(0);
  });
});
