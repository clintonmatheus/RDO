import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginTela } from './LoginTela';

describe('LoginTela', () => {
  it('entra com e-mail e senha', async () => {
    const entrar = jest.fn(async () => ({ id: 'u', nome: 'Ana', admin: false }));
    const onEntrou = jest.fn();
    await render(<LoginTela entrar={entrar} onEntrou={onEntrou} />);
    await fireEvent.changeText(screen.getByTestId('email'), 'ana@x.com');
    await fireEvent.changeText(screen.getByTestId('senha'), '123456');
    await fireEvent.press(screen.getByTestId('entrar'));
    await waitFor(() => expect(onEntrou).toHaveBeenCalledWith({ id: 'u', nome: 'Ana', admin: false }));
    expect(entrar).toHaveBeenCalledWith('ana@x.com', '123456');
  });

  it('exige e-mail e senha', async () => {
    const entrar = jest.fn();
    await render(<LoginTela entrar={entrar} onEntrou={() => {}} />);
    await fireEvent.press(screen.getByTestId('entrar'));
    expect(screen.getByText('Informe e-mail e senha')).toBeTruthy();
    expect(entrar).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor', async () => {
    const entrar = jest.fn(async () => { throw new Error('E-mail ou senha incorretos'); });
    await render(<LoginTela entrar={entrar} onEntrou={() => {}} />);
    await fireEvent.changeText(screen.getByTestId('email'), 'ana@x.com');
    await fireEvent.changeText(screen.getByTestId('senha'), 'x');
    await fireEvent.press(screen.getByTestId('entrar'));
    expect(await screen.findByText('E-mail ou senha incorretos')).toBeTruthy();
  });
});
