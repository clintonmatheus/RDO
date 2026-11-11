import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { RegistroDiaTela } from './RegistroDiaTela';
import { criarRegistroDiario } from '../domain/registro';
import { OBRAS_INICIAIS } from '../domain/obras';
import type { Usuario } from '../domain/usuario';
import { dadosDeTeste, nota } from '../testes/fabricas';
import { criarArmazenamentoMemoria } from '../storage/memoria';

const cbtu = OBRAS_INICIAIS[0];
const ubs = OBRAS_INICIAIS.find((o) => o.id === 'ubs')!;
const data = '2026-11-05';
const semFotos = { tirarFoto: async () => undefined, escolherDaGaleria: async () => undefined };
const ana: Usuario = { id: 'u-ana', nome: 'Ana', admin: false };
const beto: Usuario = { id: 'u-beto', nome: 'Beto', admin: false };
const adm: Usuario = { id: 'u-adm', nome: 'Clinton', admin: true };

async function abrir(opts: { obra?: typeof cbtu; dia?: string; usuario?: Usuario; armazenamento?: ReturnType<typeof criarArmazenamentoMemoria> } = {}) {
  const { dados, armazenamento } = dadosDeTeste(opts.usuario ?? ana, opts.armazenamento);
  const onVoltar = jest.fn();
  const dia = opts.dia ?? data;
  await render(<RegistroDiaTela obra={opts.obra ?? cbtu} data={dia} hoje={dia} dados={dados} servicoFotos={semFotos} onVoltar={onVoltar} />);
  return { dados, armazenamento, onVoltar };
}

describe('RegistroDiaTela — registro do dia (CBTU)', () => {
  it('mostra obra, data e total de efetivo zerado', async () => {
    await abrir();
    expect(screen.getByText(cbtu.nome)).toBeTruthy();
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

  it('salva efetivo, equipamentos e ritmo com a autoria do usuário', async () => {
    const { dados, onVoltar } = await abrir();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('mais-Betoneira'));
    await fireEvent.press(screen.getByTestId('ritmo-acelerado'));
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await dados.obterRegistro(cbtu.id, data);
    expect(r?.efetivo.Servente).toBe(1);
    expect(r?.equipamentos.Betoneira).toBe(1);
    expect(r?.ritmo).toBe('acelerado');
    expect(r?.atualizadoPor?.nome).toBe('Ana');
  });

  it('carrega registro existente e mostra quem editou por último', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    await armazenamento.registros.salvar(criarRegistroDiario({
      obraId: cbtu.id, data, efetivo: { Pedreiro: 4 }, autor: beto, agora: '2026-11-05T12:00:00.000Z',
    }));
    await abrir({ armazenamento });
    await waitFor(() => expect(screen.getByTestId('qtd-Pedreiro')).toHaveTextContent('4'));
    expect(screen.getByTestId('editado-por')).toHaveTextContent('Editado por Beto às 09:00');
  });

  it('dia sem expediente exige motivo e zera o efetivo', async () => {
    const { dados, onVoltar } = await abrir();
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.press(screen.getByTestId('sem-expediente'));
    await fireEvent.press(screen.getByTestId('salvar'));
    expect(screen.getByText('Informe o motivo')).toBeTruthy();
    expect(onVoltar).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('motivo'), 'Chuva');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    const r = await dados.obterRegistro(cbtu.id, data);
    expect(r?.semExpediente).toEqual({ motivo: 'Chuva' });
    expect(r?.efetivo.Servente).toBe(0);
  });
});

describe('RegistroDiaTela — obras SEINFRA e fim de semana', () => {
  it('obra fora do CBTU mostra só anotações e fotos', async () => {
    await abrir({ obra: ubs });
    expect(screen.queryByTestId('mais-Servente')).toBeNull();
    expect(screen.queryByTestId('ritmo-normal')).toBeNull();
    expect(screen.getByText('Anotações')).toBeTruthy();
    expect(screen.getByTestId('nova-anotacao')).toBeTruthy();
    expect(screen.getByTestId('foto-galeria')).toBeTruthy();
  });

  it('sábado sem lançamentos vem como sem expediente, motivo "Fim de semana"', async () => {
    const { dados, onVoltar } = await abrir({ obra: ubs, dia: '2026-11-07' });
    expect(screen.getByTestId('motivo').props.value).toBe('Fim de semana');
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    expect((await dados.obterRegistro('ubs', '2026-11-07'))?.semExpediente).toEqual({ motivo: 'Fim de semana' });
  });

  it('sábado com anotação já feita não vem marcado como sem expediente', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    await armazenamento.anotacoes.salvar(nota('ubs', '2026-11-07', 'Concretagem'));
    await abrir({ obra: ubs, dia: '2026-11-07', armazenamento });
    await screen.findByText('Concretagem');
    expect(screen.queryByTestId('motivo')).toBeNull();
  });

  it('encarregado pode desmarcar o padrão do sábado', async () => {
    const { dados, onVoltar } = await abrir({ obra: ubs, dia: '2026-11-07' });
    await fireEvent.press(screen.getByTestId('sem-expediente'));
    expect(screen.queryByTestId('motivo')).toBeNull();
    await fireEvent.press(screen.getByTestId('salvar'));
    await waitFor(() => expect(onVoltar).toHaveBeenCalled());
    expect((await dados.obterRegistro('ubs', '2026-11-07'))?.semExpediente).toBeUndefined();
  });
});

describe('RegistroDiaTela — anotações por autor', () => {
  it('adiciona anotação com autor e hora e limpa o campo', async () => {
    const { dados } = await abrir({ obra: ubs });
    await fireEvent.changeText(screen.getByTestId('nova-anotacao'), 'Reboco interno');
    await fireEvent.press(screen.getByTestId('adicionar-anotacao'));
    const item = await screen.findByTestId('anotacao-item');
    expect(within(item).getByText('Reboco interno')).toBeTruthy();
    expect(within(item).getByTestId('anotacao-autor')).toHaveTextContent(/^Ana · \d{2}:\d{2}$/);
    expect(screen.getByTestId('nova-anotacao').props.value).toBe('');
    expect((await dados.listarAnotacoes('ubs')).map((a) => a.texto)).toEqual(['Reboco interno']);
  });

  it('não adiciona anotação vazia', async () => {
    await abrir({ obra: ubs });
    await fireEvent.changeText(screen.getByTestId('nova-anotacao'), '   ');
    await fireEvent.press(screen.getByTestId('adicionar-anotacao'));
    expect(await screen.findByText('Anotação vazia')).toBeTruthy();
    expect(screen.queryByTestId('anotacao-item')).toBeNull();
  });

  it('mostra anotações de todos, mas só permite editar/excluir as próprias', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    await armazenamento.anotacoes.salvar(nota('ubs', data, 'Do Beto', '10:00', beto));
    await armazenamento.anotacoes.salvar(nota('ubs', data, 'Da Ana', '11:00', ana));
    await abrir({ obra: ubs, armazenamento });
    const itens = await screen.findAllByTestId('anotacao-item');
    expect(itens).toHaveLength(2);
    expect(within(itens[0]).getByText('Do Beto')).toBeTruthy();
    expect(within(itens[0]).queryByTestId('editar-anotacao')).toBeNull();
    expect(within(itens[1]).getByTestId('editar-anotacao')).toBeTruthy();
  });

  it('administrador pode editar e excluir anotações de outros', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    await armazenamento.anotacoes.salvar(nota('ubs', data, 'Do Beto', '10:00', beto));
    const { dados } = await abrir({ obra: ubs, usuario: adm, armazenamento });
    await fireEvent.press(await screen.findByTestId('editar-anotacao'));
    expect(screen.getByTestId('editar-texto').props.value).toBe('Do Beto');
    await fireEvent.changeText(screen.getByTestId('editar-texto'), 'Do Beto (corrigido)');
    await fireEvent.press(screen.getByTestId('confirmar-edicao'));
    expect(await screen.findByText('Do Beto (corrigido)')).toBeTruthy();
    expect(screen.getByTestId('anotacao-edicao')).toHaveTextContent(/^Editado por Clinton \(administrador\) às \d{2}:\d{2}$/);
    await fireEvent.press(screen.getByTestId('excluir-anotacao'));
    await waitFor(() => expect(screen.queryByTestId('anotacao-item')).toBeNull());
    expect(await dados.listarAnotacoes('ubs')).toEqual([]);
  });
});

describe('RegistroDiaTela — atualização vinda de outro aparelho', () => {
  it('nova anotação de outro usuário aparece sem perder o que está sendo digitado', async () => {
    const { dados, armazenamento } = dadosDeTeste(ana);
    const props = { obra: cbtu, data, hoje: data, dados, servicoFotos: semFotos, onVoltar: () => {} };
    const tela = await render(<RegistroDiaTela {...props} versao={0} />);
    await fireEvent.press(screen.getByTestId('mais-Servente'));
    await fireEvent.changeText(screen.getByTestId('nova-anotacao'), 'digitando…');
    await armazenamento.anotacoes.salvar(nota(cbtu.id, data, 'Do Beto', '10:00', beto));
    await armazenamento.registros.salvar(criarRegistroDiario({ obraId: cbtu.id, data, efetivo: { Servente: 9 }, autor: beto, agora: '2026-11-05T13:00:00.000Z' }));
    await tela.rerender(<RegistroDiaTela {...props} versao={1} />);
    expect(await screen.findByText('Do Beto')).toBeTruthy();
    expect(screen.getByTestId('qtd-Servente')).toHaveTextContent('1');
    expect(screen.getByTestId('nova-anotacao').props.value).toBe('digitando…');
    expect(screen.getByTestId('editado-por')).toHaveTextContent('Editado por Beto às 10:00');
  });

  it('sem alterações locais, o formulário passa a mostrar os valores recebidos', async () => {
    const { dados, armazenamento } = dadosDeTeste(ana);
    const props = { obra: cbtu, data, hoje: data, dados, servicoFotos: semFotos, onVoltar: () => {} };
    const tela = await render(<RegistroDiaTela {...props} versao={0} />);
    await armazenamento.registros.salvar(criarRegistroDiario({ obraId: cbtu.id, data, efetivo: { Servente: 9 }, autor: beto, agora: '2026-11-05T13:00:00.000Z' }));
    await tela.rerender(<RegistroDiaTela {...props} versao={1} />);
    await waitFor(() => expect(screen.getByTestId('qtd-Servente')).toHaveTextContent('9'));
  });
});
