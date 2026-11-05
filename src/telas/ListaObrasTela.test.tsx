import { render, screen, fireEvent } from '@testing-library/react-native';
import { ListaObrasTela } from './ListaObrasTela';
import { OBRAS_INICIAIS } from '../domain/obras';

describe('ListaObrasTela', () => {
  it('mostra as 4 obras com nome e órgão', async () => {
    await render(<ListaObrasTela obras={OBRAS_INICIAIS} onAbrir={() => {}} />);
    expect(screen.getAllByTestId('obra-item')).toHaveLength(4);
    expect(screen.getByText('Construção da Estação Ferroviária Baraúna')).toBeTruthy();
    expect(screen.getAllByText(/SEMOV/).length).toBe(3);
  });

  it('abre a obra tocada', async () => {
    const onAbrir = jest.fn();
    await render(<ListaObrasTela obras={OBRAS_INICIAIS} onAbrir={onAbrir} />);
    await fireEvent.press(screen.getAllByTestId('obra-item')[1]);
    expect(onAbrir).toHaveBeenCalledWith(OBRAS_INICIAIS[1]);
  });
});
