import { DatabaseSync } from 'node:sqlite';
import { abrirBanco, RepositorioFotosSqlite, RepositorioRegistrosSqlite, type BancoSql } from './sqlite';
import { testarRepositorioFotos, testarRepositorioRegistros } from './contrato.test-suite';

function bancoNode(): BancoSql {
  const db = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => { db.exec(sql); },
    executar: async (sql, params = []) => { db.prepare(sql).run(...params); },
    consultar: async (sql, params = []) => db.prepare(sql).all(...params) as any[],
  };
}

testarRepositorioRegistros('sqlite', async () => new RepositorioRegistrosSqlite(await abrirBanco(bancoNode())));
testarRepositorioFotos('sqlite', async () => new RepositorioFotosSqlite(await abrirBanco(bancoNode())));

describe('migração', () => {
  it('é idempotente', async () => {
    const b = bancoNode();
    await abrirBanco(b);
    await expect(abrirBanco(b)).resolves.toBe(b);
  });
});
