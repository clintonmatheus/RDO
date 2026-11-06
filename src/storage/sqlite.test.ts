import { DatabaseSync } from 'node:sqlite';
import { abrirBanco, criarArmazenamentoSqlite, type BancoSql } from './sqlite';
import {
  testarFilaECursores, testarRepositorioAnotacoes, testarRepositorioFotos, testarRepositorioFotosSync, testarRepositorioRegistros,
} from './contrato.test-suite';

export function bancoNode(): BancoSql {
  const db = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => { db.exec(sql); },
    executar: async (sql, params = []) => { db.prepare(sql).run(...params); },
    consultar: async (sql, params = []) => db.prepare(sql).all(...params) as any[],
  };
}

const novo = async () => criarArmazenamentoSqlite(await abrirBanco(bancoNode()));
testarRepositorioRegistros('sqlite', async () => (await novo()).registros);
testarRepositorioFotos('sqlite', async () => (await novo()).fotos);
testarRepositorioFotosSync('sqlite', async () => (await novo()).fotos);
testarRepositorioAnotacoes('sqlite', async () => (await novo()).anotacoes);
testarFilaECursores('sqlite', novo);

describe('migração', () => {
  it('é idempotente', async () => {
    const b = bancoNode();
    await abrirBanco(b);
    await expect(abrirBanco(b)).resolves.toBe(b);
  });
});
