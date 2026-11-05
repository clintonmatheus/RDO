import type { RegistroDiario } from '../domain/registro';
import type { Foto } from '../domain/foto';
import type { RepositorioFotos, RepositorioRegistros } from './contrato';

/** Abstração mínima de banco SQL: o app usa expo-sqlite; os testes usam node:sqlite. */
export interface BancoSql {
  exec(sql: string): Promise<void>;
  executar(sql: string, params?: (string | number | null)[]): Promise<void>;
  consultar<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS registros (
  obra_id TEXT NOT NULL,
  data TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (obra_id, data)
);
CREATE TABLE IF NOT EXISTS fotos (
  id TEXT PRIMARY KEY,
  obra_id TEXT NOT NULL,
  data TEXT NOT NULL,
  capturada_em TEXT NOT NULL,
  json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fotos_dia ON fotos (obra_id, data, capturada_em);
`;

export async function abrirBanco(banco: BancoSql): Promise<BancoSql> {
  await banco.exec(ESQUEMA);
  return banco;
}

export class RepositorioRegistrosSqlite implements RepositorioRegistros {
  constructor(private banco: BancoSql) {}

  async salvar(r: RegistroDiario) {
    await this.banco.executar('INSERT OR REPLACE INTO registros (obra_id, data, json) VALUES (?, ?, ?)', [
      r.obraId, r.data, JSON.stringify(r),
    ]);
  }

  async obter(obraId: string, data: string) {
    const [l] = await this.banco.consultar<{ json: string }>(
      'SELECT json FROM registros WHERE obra_id = ? AND data = ?', [obraId, data]);
    return l ? (JSON.parse(l.json) as RegistroDiario) : undefined;
  }

  async listar(obraId: string, de = '0000-00-00', ate = '9999-99-99') {
    const l = await this.banco.consultar<{ json: string }>(
      'SELECT json FROM registros WHERE obra_id = ? AND data >= ? AND data <= ? ORDER BY data', [obraId, de, ate]);
    return l.map((x) => JSON.parse(x.json) as RegistroDiario);
  }
}

export class RepositorioFotosSqlite implements RepositorioFotos {
  constructor(private banco: BancoSql) {}

  async salvar(f: Foto) {
    await this.banco.executar(
      'INSERT OR REPLACE INTO fotos (id, obra_id, data, capturada_em, json) VALUES (?, ?, ?, ?, ?)',
      [f.id, f.obraId, f.data, f.capturadaEm, JSON.stringify(f)]);
  }

  async remover(id: string) {
    await this.banco.executar('DELETE FROM fotos WHERE id = ?', [id]);
  }

  async listarPorDia(obraId: string, data: string) {
    return this.ler('SELECT json FROM fotos WHERE obra_id = ? AND data = ? ORDER BY capturada_em', [obraId, data]);
  }

  async listarPorObra(obraId: string) {
    return this.ler('SELECT json FROM fotos WHERE obra_id = ? ORDER BY capturada_em', [obraId]);
  }

  private async ler(sql: string, params: string[]) {
    const l = await this.banco.consultar<{ json: string }>(sql, params);
    return l.map((x) => JSON.parse(x.json) as Foto);
  }
}
