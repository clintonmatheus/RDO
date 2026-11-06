import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Raiz } from './Raiz';
import { RepositorioFotosMemoria, RepositorioRegistrosMemoria } from '../storage/memoria';

describe('Raiz', () => {
  it('navega da lista para o registro do dia e volta ao salvar', async () => {
    const repo = new RepositorioRegistrosMemoria();
    await render(<Raiz repositorio={repo} fotos={new RepositorioFotosMemoria()} hoje="2026-11-05" gerarPdf={async () => {}}
    servicoFotos={{ tirarFoto: async () => undefined, escolherDaGaleria: async () => undefined }} />);
    await fireEvent.press(screen.getAllByTestId('obra-item')[0]);
    await fireEvent.press(await screen.findByTestId('dia-2026-11-05'));
    expect(screen.getByText('05/11/2026')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(screen.getAllByTestId('dia-item')).toHaveLength(30));
    await fireEvent.press(screen.getByTestId('voltar'));
    expect(screen.getAllByTestId('obra-item')).toHaveLength(4);
    expect((await repo.obter('cbtu-barauna', '2026-11-05'))?.efetivo.Servente).toBe(1);
  });
});
