import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Raiz } from './Raiz';
import { dadosDeTeste } from '../testes/fabricas';

const semFotos = { tirarFoto: async () => undefined, escolherDaGaleria: async () => undefined };

describe('Raiz', () => {
  it('navega da lista para o registro do dia e volta ao salvar', async () => {
    const { dados } = dadosDeTeste();
    await render(<Raiz dados={dados} hoje="2026-11-05" gerarPdf={async () => {}} servicoFotos={semFotos} />);
    await fireEvent.press(screen.getAllByTestId('obra-item')[0]);
    await fireEvent.press(await screen.findByTestId('dia-2026-11-05'));
    expect(screen.getByText('05/11/2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(screen.getAllByTestId('dia-item')).toHaveLength(30));
    await fireEvent.press(screen.getByTestId('voltar'));
    expect(screen.getAllByTestId('obra-item')).toHaveLength(4);
    expect((await dados.obterRegistro('cbtu-barauna', '2026-11-05'))?.efetivo.Servente).toBe(1);
  });

  it('mostra usuário, situação da sincronização e permite sair', async () => {
    const { dados } = dadosDeTeste();
    const onSair = jest.fn();
    const onSincronizar = jest.fn();
    await render(<Raiz dados={dados} hoje="2026-11-05" gerarPdf={async () => {}} servicoFotos={semFotos}
      estadoSync={{ sincronizando: false, recebidos: 0, erro: 'Sem conexão' }} onSair={onSair} onSincronizar={onSincronizar} />);
    expect(screen.getByTestId('usuario-nome')).toHaveTextContent('Teste');
    expect(screen.getByTestId('estado-sync')).toHaveTextContent('Sem conexão — dados salvos no aparelho');
    await fireEvent.press(screen.getByTestId('sincronizar'));
    expect(onSincronizar).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('sair'));
    expect(onSair).toHaveBeenCalled();
  });
});
