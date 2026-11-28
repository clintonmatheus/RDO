import { Dados } from '../dados/dados';
import { criarArmazenamentoMemoria } from '../storage/memoria';
import type { Usuario } from '../domain/usuario';
import { Sincronizador } from './sincronizador';
import { RemotoFalso } from './remoto-falso';

const ana: Usuario = { id: 'u-ana', nome: 'Ana', admin: false };
const beto: Usuario = { id: 'u-beto', nome: 'Beto', admin: false };

let relogio = 0;
function aparelho(usuario: Usuario, remoto: RemotoFalso) {
  const armazenamento = criarArmazenamentoMemoria();
  const dados = new Dados(armazenamento, usuario, {
    agora: () => new Date(Date.UTC(2026, 10, 6, 12, 0, relogio++)).toISOString(),
    novoId: () => `${usuario.id}-${relogio++}`,
  });
  return { dados, armazenamento, sync: new Sincronizador(armazenamento, remoto) };
}

describe('Sincronizador', () => {
  it('anotação feita num aparelho aparece no outro', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await a.dados.adicionarAnotacao('cbtu-barauna', '2026-11-06', 'Concretagem');
    expect(await a.sync.sincronizar()).toEqual({ enviados: 1, recebidos: 0 });
    expect(await a.armazenamento.fila.listar()).toEqual([]);
    await b.sync.sincronizar();
    const lista = await b.dados.listarAnotacoes('cbtu-barauna');
    expect(lista.map((x) => [x.texto, x.autorNome])).toEqual([['Concretagem', 'Ana']]);
  });

  it('dois usuários anotam o mesmo dia sem se sobrescrever', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    await b.dados.adicionarAnotacao('ubs', '2026-11-06', 'Pintura');
    await a.sync.sincronizar();
    await b.sync.sincronizar();
    await a.sync.sincronizar();
    for (const x of [a, b]) {
      expect((await x.dados.listarAnotacoes('ubs')).map((n) => n.texto).sort()).toEqual(['Pintura', 'Reboco']);
    }
  });

  it('registro do dia: a última gravação enviada prevalece em todos os aparelhos', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await a.dados.salvarRegistro({ obraId: 'cbtu-barauna', data: '2026-11-06', efetivo: { Servente: 2 } });
    await a.sync.sincronizar();
    await b.sync.sincronizar();
    await b.dados.salvarRegistro({ obraId: 'cbtu-barauna', data: '2026-11-06', efetivo: { Servente: 5 } });
    await b.sync.sincronizar();
    await a.sync.sincronizar();
    const r = await a.dados.obterRegistro('cbtu-barauna', '2026-11-06');
    expect(r?.efetivo.Servente).toBe(5);
    expect(r?.atualizadoPor?.nome).toBe('Beto');
  });

  it('alteração local ainda não enviada não é sobrescrita pelo servidor', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await b.dados.salvarRegistro({ obraId: 'ubs', data: '2026-11-06', semExpediente: 'Chuva' });
    await b.sync.sincronizar();
    await a.dados.salvarRegistro({ obraId: 'ubs', data: '2026-11-06' });
    remoto.falharEnvios = true;
    await expect(a.sync.sincronizar()).rejects.toThrow('Sem conexão');
    expect((await a.dados.obterRegistro('ubs', '2026-11-06'))?.semExpediente).toBeUndefined();
    expect(await a.armazenamento.fila.contem('registro', 'ubs|2026-11-06')).toBe(true);
  });

  it('sem conexão mantém a fila e envia depois', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    remoto.falharEnvios = true;
    await expect(a.sync.sincronizar()).rejects.toThrow('Sem conexão');
    expect(await a.armazenamento.fila.listar()).toHaveLength(1);
    remoto.falharEnvios = false;
    expect((await a.sync.sincronizar()).enviados).toBe(1);
    expect(await a.armazenamento.fila.listar()).toHaveLength(0);
  });

  it('exclusão de anotação se propaga', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    const n = await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Errada');
    await a.sync.sincronizar();
    await b.sync.sincronizar();
    await a.dados.excluirAnotacao(n.id);
    await a.sync.sincronizar();
    await b.sync.sincronizar();
    expect(await b.dados.listarAnotacoes('ubs')).toEqual([]);
  });

  it('foto: envia o arquivo uma vez e o outro aparelho baixa uma cópia local', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    const f = await a.dados.adicionarFoto({ obraId: 'ubs', uri: 'file://a/foto.jpg', origem: 'camera', capturadaEm: '2026-11-06T15:00:00.000Z' });
    await a.sync.sincronizar();
    expect(remoto.arquivosEnviados).toEqual([f.id]);
    expect((await a.armazenamento.fotos.obter(f.id))?.caminhoRemoto).toBe(`ubs/${f.id}.jpg`);
    await a.sync.sincronizar();
    expect(remoto.arquivosEnviados).toEqual([f.id]);
    await b.sync.sincronizar();
    const [fb] = await b.dados.listarFotosDoDia('ubs', '2026-11-06');
    expect(fb.uri).toBe(`file://baixadas/${f.id}.jpg`);
    expect(fb.autorNome).toBe('Ana');
  });

  it('foto cujo download falhou é tentada de novo na próxima sincronização', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    const f = await a.dados.adicionarFoto({ obraId: 'ubs', uri: 'file://a/foto.jpg', origem: 'camera', capturadaEm: '2026-11-06T15:00:00.000Z' });
    await a.sync.sincronizar();
    remoto.falharDownloads = true;
    await b.sync.sincronizar();
    expect((await b.armazenamento.fotos.obter(f.id))?.uri).toBe('');
    remoto.falharDownloads = false;
    await b.sync.sincronizar();
    expect((await b.armazenamento.fotos.obter(f.id))?.uri).toBe(`file://baixadas/${f.id}.jpg`);
  });

  it('chamadas simultâneas compartilham a mesma execução', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'x');
    const [r1, r2] = await Promise.all([a.sync.sincronizar(), a.sync.sincronizar()]);
    expect(r1).toBe(r2);
    expect(remoto.totalEnvios).toBe(1);
  });
});

describe('Sincronizador — item recusado pelo servidor', () => {
  it('não trava a fila: envia os demais, informa o erro e descarta o recusado', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const ruim = await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'recusada');
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'boa');
    remoto.recusar.add(ruim.id);
    await expect(a.sync.sincronizar()).rejects.toThrow('Sem permissão no servidor');
    const fila = await a.armazenamento.fila.listar();
    expect(fila).toEqual([]);
    expect(remoto.totalEnvios).toBe(1);
    expect((await a.dados.listarAnotacoes('ubs')).map((x) => x.texto).sort()).toEqual(['boa', 'recusada']);
  });
});

describe('Sincronizador — contagem de recebidos', () => {
  it('itens repetidos (sobreposição do cursor) que não mudaram não contam como recebidos', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    await a.dados.salvarRegistro({ obraId: 'ubs', data: '2026-11-06' });
    await a.dados.adicionarFoto({ obraId: 'ubs', uri: 'file://a/f.jpg', origem: 'camera', capturadaEm: '2026-11-06T15:00:00.000Z' });
    await a.sync.sincronizar();
    expect((await b.sync.sincronizar()).recebidos).toBe(3);
    remoto.ignorarCursor = true;
    expect((await b.sync.sincronizar()).recebidos).toBe(0);
    expect((await a.sync.sincronizar()).recebidos).toBe(0);
  });
});

describe('Sincronizador — edição recusada pelo servidor', () => {
  it('a cópia local volta a ser a do servidor', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    const n = await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Original da Ana');
    await a.sync.sincronizar();
    await b.sync.sincronizar();
    // simula uma edição indevida no aparelho do Beto (ex.: permissão desatualizada)
    await b.armazenamento.anotacoes.salvar({ ...n, texto: 'alterada pelo Beto' });
    await b.armazenamento.fila.adicionar('anotacao', n.id);
    remoto.recusar.add(n.id);
    await expect(b.sync.sincronizar()).rejects.toThrow('Sem permissão no servidor');
    expect((await b.dados.listarAnotacoes('ubs'))[0].texto).toBe('Original da Ana');
    expect(await b.armazenamento.fila.listar()).toEqual([]);
  });
});

describe('item malformado vindo do servidor', () => {
  it('é ignorado e não trava a sincronização nem a lista do dia', async () => {
    const remoto = new RemotoFalso();
    const a = aparelho(ana, remoto);
    const b = aparelho(beto, remoto);
    await a.dados.adicionarAnotacao('ubs', '2026-11-06', 'Reboco');
    await a.sync.sincronizar();
    // gravados direto na API, sem o app: anotação sem data de criação e foto com id que vira caminho de arquivo
    await remoto.enviarAnotacao({ id: 'ruim1', obraId: 'ubs', data: '2026-11-06', texto: 'x' } as never);
    await remoto.enviarAnotacao({ id: 'ruim2', obraId: 'ubs', data: '2026-11-06', texto: 'y' } as never);
    await remoto.enviarFoto({ id: '../x', obraId: 'ubs', data: '2026-11-06', capturadaEm: '2026-11-06T12:00:00Z', uri: '', origem: 'camera', dataConfiavel: true } as never);
    await b.sync.sincronizar();
    const lista = await b.dados.listarAnotacoes('ubs');
    expect(lista.map((x) => x.texto)).toEqual(['Reboco']);
    expect(await b.armazenamento.fotos.obter('../x')).toBeUndefined();
  });
});
