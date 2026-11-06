import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';
import type {
  Armazenamento, Cursores, FilaEnvio, Pendencia, RepositorioAnotacoes, RepositorioFotos, RepositorioRegistros, TipoPendencia,
} from './contrato';

/** Abstração mínima de banco SQL: o app usa expo-sqlite; os testes usam node:sqlite. */
export interface BancoSql {
  exec(sql: string): Promise<void>;
  executar(sql: string, params?: (string | number | null)[]): Promise<void>;
  consultar<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS registros (
  obra_id TEXT NOT NULL, data TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (obra_id, data)
);
CREATE TABLE IF NOT EXISTS fotos (
  id TEXT PRIMARY KEY, obra_id TEXT NOT NULL, data TEXT NOT NULL, capturada_em TEXT NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fotos_dia ON fotos (obra_id, data, capturada_em);
CREATE TABLE IF NOT EXISTS anotacoes (
  id TEXT PRIMARY KEY, obra_id TEXT NOT NULL, data TEXT NOT NULL, criada_em TEXT NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_anotacoes_dia ON anotacoes (obra_id, data, criada_em);
CREATE TABLE IF NOT EXISTS fila_envio (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, UNIQUE (tipo, chave)
);
CREATE TABLE IF NOT EXISTS cursores (tabela TEXT PRIMARY KEY, valor TEXT NOT NULL);
`;

export async function abrirBanco(banco: BancoSql): Promise<BancoSql> {
  await banco.exec(ESQUEMA);
  return banco;
}

type Linha = { json: string };
const ler = <T>(l: Linha[]) => l.map((x) => JSON.parse(x.json) as T);

export class RepositorioRegistrosSqlite implements RepositorioRegistros {
  constructor(private banco: BancoSql) {}
  async salvar(r: RegistroDiario) {
    await this.banco.executar('INSERT OR REPLACE INTO registros (obra_id, data, json) VALUES (?, ?, ?)', [r.obraId, r.data, JSON.stringify(r)]);
  }
  async obter(obraId: string, data: string) {
    const [r] = ler<RegistroDiario>(await this.banco.consultar<Linha>('SELECT json FROM registros WHERE obra_id = ? AND data = ?', [obraId, data]));
    return r;
  }
  async listar(obraId: string, de = '0000-00-00', ate = '9999-99-99') {
    return ler<RegistroDiario>(await this.banco.consultar<Linha>(
      'SELECT json FROM registros WHERE obra_id = ? AND data >= ? AND data <= ? ORDER BY data', [obraId, de, ate]));
  }
}

export class RepositorioFotosSqlite implements RepositorioFotos {
  constructor(private banco: BancoSql) {}
  async salvar(f: Foto) {
    await this.banco.executar('INSERT OR REPLACE INTO fotos (id, obra_id, data, capturada_em, json) VALUES (?, ?, ?, ?, ?)',
      [f.id, f.obraId, f.data, f.capturadaEm, JSON.stringify(f)]);
  }
  async remover(id: string) { await this.banco.executar('DELETE FROM fotos WHERE id = ?', [id]); }
  async obter(id: string) {
    const [f] = ler<Foto>(await this.banco.consultar<Linha>('SELECT json FROM fotos WHERE id = ?', [id]));
    return f;
  }
  async listarPorDia(obraId: string, data: string) {
    return this.visiveis('SELECT json FROM fotos WHERE obra_id = ? AND data = ? ORDER BY capturada_em', [obraId, data]);
  }
  async listarPorObra(obraId: string) {
    return this.visiveis('SELECT json FROM fotos WHERE obra_id = ? ORDER BY capturada_em', [obraId]);
  }
  async listarSemArquivo() {
    return ler<Foto>(await this.banco.consultar<Linha>('SELECT json FROM fotos')).filter((f) => !f.excluida && !f.uri && !!f.caminhoRemoto);
  }
  private async visiveis(sql: string, params: string[]) {
    return ler<Foto>(await this.banco.consultar<Linha>(sql, params)).filter((f) => !f.excluida);
  }
}

export class RepositorioAnotacoesSqlite implements RepositorioAnotacoes {
  constructor(private banco: BancoSql) {}
  async salvar(a: Anotacao) {
    await this.banco.executar('INSERT OR REPLACE INTO anotacoes (id, obra_id, data, criada_em, json) VALUES (?, ?, ?, ?, ?)',
      [a.id, a.obraId, a.data, a.criadaEm, JSON.stringify(a)]);
  }
  async obter(id: string) {
    const [a] = ler<Anotacao>(await this.banco.consultar<Linha>('SELECT json FROM anotacoes WHERE id = ?', [id]));
    return a;
  }
  async listar(obraId: string, de = '0000-00-00', ate = '9999-99-99') {
    return ler<Anotacao>(await this.banco.consultar<Linha>(
      'SELECT json FROM anotacoes WHERE obra_id = ? AND data >= ? AND data <= ? ORDER BY criada_em', [obraId, de, ate]))
      .filter((a) => !a.excluida);
  }
}

export class FilaEnvioSqlite implements FilaEnvio {
  constructor(private banco: BancoSql) {}
  async adicionar(tipo: TipoPendencia, chave: string) {
    await this.banco.executar('INSERT OR IGNORE INTO fila_envio (tipo, chave) VALUES (?, ?)', [tipo, chave]);
  }
  async listar() {
    return this.banco.consultar<Pendencia>('SELECT tipo, chave FROM fila_envio ORDER BY seq');
  }
  async remover(tipo: TipoPendencia, chave: string) {
    await this.banco.executar('DELETE FROM fila_envio WHERE tipo = ? AND chave = ?', [tipo, chave]);
  }
  async contem(tipo: TipoPendencia, chave: string) {
    return (await this.banco.consultar('SELECT 1 FROM fila_envio WHERE tipo = ? AND chave = ?', [tipo, chave])).length > 0;
  }
}

export class CursoresSqlite implements Cursores {
  constructor(private banco: BancoSql) {}
  async obter(t: string) {
    const [l] = await this.banco.consultar<{ valor: string }>('SELECT valor FROM cursores WHERE tabela = ?', [t]);
    return l?.valor;
  }
  async definir(t: string, v: string) {
    await this.banco.executar('INSERT OR REPLACE INTO cursores (tabela, valor) VALUES (?, ?)', [t, v]);
  }
}

export function criarArmazenamentoSqlite(banco: BancoSql): Armazenamento {
  return {
    registros: new RepositorioRegistrosSqlite(banco),
    anotacoes: new RepositorioAnotacoesSqlite(banco),
    fotos: new RepositorioFotosSqlite(banco),
    fila: new FilaEnvioSqlite(banco),
    cursores: new CursoresSqlite(banco),
  };
}
