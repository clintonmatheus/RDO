import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RegistroDiaTela } from './RegistroDiaTela';
import type { ServicoFotos } from '../fotos/servico';
import { OBRAS_INICIAIS } from '../domain/obras';
import { criarFoto } from '../domain/foto';
import { dadosDeTeste } from '../testes/fabricas';
import { criarArmazenamentoMemoria } from '../storage/memoria';

const obra = OBRAS_INICIAIS[0];

function servicoFalso(): ServicoFotos {
  return {
    tirarFoto: jest.fn(async () => ({ uri: 'file://cam.jpg', capturadaEm: '2026-11-05T15:00:00.000Z' })),
    escolherDaGaleria: jest.fn(async () => ({ uri: 'file://gal.jpg', capturadaEm: '2026-11-01T12:00:00.000Z' })),
  };
}

async function abrir(data: string, servico = servicoFalso(), armazenamento = criarArmazenamentoMemoria()) {
  const { dados } = dadosDeTeste(undefined, armazenamento);
  await render(<RegistroDiaTela obra={obra} data={data} hoje="2026-11-05" dados={dados} servicoFotos={servico} onVoltar={() => {}} />);
  return { dados, servico };
}

describe('Fotos do dia', () => {
  it('foto da câmera é salva no dia da captura, com autor, e aparece na tela', async () => {
    const { dados } = await abrir('2026-11-05');
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    const [f] = await dados.listarFotosDoDia(obra.id, '2026-11-05');
    expect(f.origem).toBe('camera');
    expect(f.dataConfiavel).toBe(true);
    expect(f.autorNome).toBe('Teste');
  });

  it('só oferece a câmera no dia de hoje', async () => {
    await abrir('2026-11-04');
    expect(screen.queryByTestId('tirar-foto')).toBeNull();
    expect(screen.getByTestId('foto-galeria')).toBeTruthy();
  });

  it('foto da galeria pertence ao dia aberto, mesmo com data original diferente', async () => {
    const { dados } = await abrir('2026-11-04');
    await fireEvent.press(screen.getByTestId('foto-galeria'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    const [f] = await dados.listarFotosDoDia(obra.id, '2026-11-04');
    expect(f.origem).toBe('galeria');
    expect(f.dataConfiavel).toBe(false);
    expect(f.capturadaEm).toBe('2026-11-01T12:00:00.000Z');
  });

  it('cancelar a captura não salva nada', async () => {
    const servico = servicoFalso();
    (servico.tirarFoto as jest.Mock).mockResolvedValue(undefined);
    const { dados } = await abrir('2026-11-05', servico);
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(servico.tirarFoto).toHaveBeenCalled());
    expect(await dados.listarFotosDaObra(obra.id)).toHaveLength(0);
  });

  it('remove a própria foto', async () => {
    const { dados } = await abrir('2026-11-05');
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    await fireEvent.press(screen.getByTestId('remover-foto'));
    await waitFor(() => expect(screen.queryAllByTestId('foto-item')).toHaveLength(0));
    expect(await dados.listarFotosDaObra(obra.id)).toHaveLength(0);
  });

  it('foto de outro usuário não tem botão de remover', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    await armazenamento.fotos.salvar({
      ...criarFoto({ id: 'x', obraId: obra.id, uri: 'file://x.jpg', origem: 'camera', capturadaEm: '2026-11-05T15:00:00.000Z' }),
      autorId: 'outro', autorNome: 'Outro',
    });
    await abrir('2026-11-05', servicoFalso(), armazenamento);
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    expect(screen.queryByTestId('remover-foto')).toBeNull();
  });
});

describe('Foto ampliada', () => {
  it('abre a foto em tela cheia ao tocar e fecha', async () => {
    await abrir('2026-11-05');
    await fireEvent.press(screen.getByTestId('tirar-foto'));
    await waitFor(() => expect(screen.getAllByTestId('foto-item')).toHaveLength(1));
    expect(screen.queryByTestId('foto-ampliada')).toBeNull();
    await fireEvent.press(screen.getByTestId('abrir-foto'));
    expect(screen.getByTestId('foto-ampliada')).toBeTruthy();
    expect(screen.getByTestId('foto-ampliada-legenda')).toHaveTextContent('05/11/2026 · Teste');
    await fireEvent.press(screen.getByTestId('fechar-foto'));
    expect(screen.queryByTestId('foto-ampliada')).toBeNull();
  });
});
