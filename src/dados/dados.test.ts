import { Dados } from './dados';
import { criarArmazenamentoMemoria } from '../storage/memoria';
import type { Usuario } from '../domain/usuario';

const ana: Usuario = { id: 'u-ana', nome: 'Ana', admin: false };
const beto: Usuario = { id: 'u-beto', nome: 'Beto', admin: false };
const adm: Usuario = { id: 'u-adm', nome: 'Clinton', admin: true };

function criar(usuario: Usuario = ana, armazenamento = criarArmazenamentoMemoria()) {
  let n = 0;
  const aoAlterar = jest.fn();
  const dados = new Dados(armazenamento, usuario, {
    agora: () => `2026-11-06T12:00:0${n}.000Z`,
    novoId: () => `id${++n}`,
    aoAlterar,
  });
  return { dados, armazenamento, aoAlterar };
}

describe('Dados — registro do dia', () => {
  it('salva com autoria, põe na fila de envio e avisa a alteração', async () => {
    const { dados, armazenamento, aoAlterar } = criar();
    const r = await dados.salvarRegistro({ obraId: 'cbtu-barauna', data: '2026-11-06', efetivo: { Servente: 3 } });
    expect(r.atualizadoPor).toEqual({ id: 'u-ana', nome: 'Ana' });
    expect(await dados.obterRegistro('cbtu-barauna', '2026-11-06')).toEqual(r);
    expect(await armazenamento.fila.listar()).toEqual([{ tipo: 'registro', chave: 'cbtu-barauna|2026-11-06' }]);
    expect(aoAlterar).toHaveBeenCalledTimes(1);
  });
});

describe('Dados — anotações', () => {
  it('adiciona com o usuário atual como autor', async () => {
    const { dados, armazenamento } = criar();
    const a = await dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    expect(a.autorNome).toBe('Ana');
    expect(await dados.listarAnotacoes('ubs', '2026-11-06', '2026-11-06')).toEqual([a]);
    expect(await armazenamento.fila.contem('anotacao', a.id)).toBe(true);
  });

  it('outro usuário não edita nem exclui; o administrador pode', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    const a = await criar(ana, armazenamento).dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    await expect(criar(beto, armazenamento).dados.editarAnotacao(a.id, 'x')).rejects.toThrow('Sem permissão');
    await expect(criar(beto, armazenamento).dados.excluirAnotacao(a.id)).rejects.toThrow('Sem permissão');
    await criar(adm, armazenamento).dados.editarAnotacao(a.id, 'Reboco interno');
    expect((await armazenamento.anotacoes.obter(a.id))?.texto).toBe('Reboco interno');
    await criar(ana, armazenamento).dados.excluirAnotacao(a.id);
    expect(await criar(ana, armazenamento).dados.listarAnotacoes('ubs')).toEqual([]);
  });

  it('anotação inexistente gera erro claro', async () => {
    await expect(criar().dados.editarAnotacao('nada', 'x')).rejects.toThrow('Anotação não encontrada');
  });
});

describe('Dados — fotos', () => {
  it('adiciona com autor e id gerado; exclusão é lógica e respeita permissão', async () => {
    const armazenamento = criarArmazenamentoMemoria();
    const { dados } = criar(ana, armazenamento);
    const f = await dados.adicionarFoto({ obraId: 'ubs', uri: 'file://a.jpg', origem: 'camera', capturadaEm: '2026-11-06T15:00:00.000Z' });
    expect(f).toMatchObject({ autorId: 'u-ana', autorNome: 'Ana', data: '2026-11-06', excluida: false });
    expect(await dados.listarFotosDoDia('ubs', '2026-11-06')).toHaveLength(1);
    await expect(criar(beto, armazenamento).dados.removerFoto(f.id)).rejects.toThrow('Sem permissão');
    await dados.removerFoto(f.id);
    expect(await dados.listarFotosDoDia('ubs', '2026-11-06')).toHaveLength(0);
    expect((await armazenamento.fotos.obter(f.id))?.excluida).toBe(true);
    expect(await armazenamento.fila.contem('foto', f.id)).toBe(true);
  });
});
