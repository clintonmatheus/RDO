import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fazerBackup, fazerBackupFotos } from './backup.mjs';
import { gerarSql } from './restaurar.mjs';

/** Supabase de mentira: tabelas em memória, ordenadas pela ordem em que as colunas são pedidas. */
function falso({ tabelas, usuarios }) {
  return {
    from: (t) => {
      const ordem = [];
      const q = {
        select: () => q,
        order: (c) => { ordem.push(c); return q; },
        range: async (de, ate) => (t in tabelas
          ? { data: tabelas[t].slice(de, ate + 1), error: null, ordem }
          : { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }),
      };
      return q;
    },
    auth: { admin: { listUsers: async ({ page }) => ({ data: { users: page === 1 ? usuarios : [] }, error: null }) } },
  };
}

const ID = '00000000-0000-0000-0000-000000000001';

test('backup grava as tabelas (inclusive a de chave composta) e os logins; tabela ausente é ignorada', async () => {
  const anotacoes = Array.from({ length: 2300 }, (_, i) => ({ id: `a${String(i).padStart(4, '0')}`, obra_id: 'cbtu', data: '2026-11-03', autor_id: ID, excluida: false, dados: { texto: "Concretagem d'água" } }));
  const tabelas = {
    perfis: [{ id: ID, nome: 'Clinton', admin: true }],
    registros: [{ obra_id: 'cbtu', data: '2026-11-03', atualizado_por: ID, dados: { efetivo: 4 } }],
    anotacoes,
  };
  const sb = falso({ tabelas, usuarios: [{ id: ID, email: 'c@x.com', created_at: '2026-01-01' }] });
  const pasta = await mkdtemp(join(tmpdir(), 'bk-'));
  const r = await fazerBackup(sb, pasta, new Date('2026-11-26T06:17:00Z'));
  assert.equal(r.tabelas.anotacoes, 2300);
  assert.equal(r.tabelas.registros, 1);
  assert.deepEqual(r.ausentes, ['fotos', 'auditoria']);
  assert.equal(r.usuarios, 1);
  assert.equal(JSON.parse(await readFile(join(pasta, 'dados', 'anotacoes.json'), 'utf8')).length, 2300);

  const sql = await gerarSql(pasta);
  assert.match(sql, /set local session_replication_role = replica;/);
  assert.match(sql, /d''água/);
  assert.equal((sql.match(/insert into public\.anotacoes/g) ?? []).length, 12); // lotes de 200
  assert.match(sql, /insert into public\.registros .* on conflict \(obra_id, data\) do update set atualizado_por = excluded\.atualizado_por/);
  assert.match(sql, /commit;\n$/);
});

test('abrir.mjs descriptografa o que o openssl da tarefa agendada gera', async () => {
  const { execFileSync } = await import('node:child_process');
  const { writeFile } = await import('node:fs/promises');
  const { descriptografar } = await import('./abrir.mjs');
  const pasta = await mkdtemp(join(tmpdir(), 'enc-'));
  await writeFile(join(pasta, 'x.tar.gz'), 'conteúdo da cópia');
  execFileSync('openssl', ['enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt', '-in', join(pasta, 'x.tar.gz'), '-out', join(pasta, 'x.enc'), '-pass', 'pass:senha forte 123']);
  const bytes = await readFile(join(pasta, 'x.enc'));
  assert.equal(descriptografar(bytes, 'senha forte 123').toString(), 'conteúdo da cópia');
  assert.throws(() => descriptografar(bytes, 'errada'), /Senha errada/);
});

test('cópia das fotos baixa os arquivos das pastas e ignora nomes que sairiam da pasta da cópia', async () => {
  const arquivos = { 'cbtu/f1.jpg': 'foto 1', 'ubs/f2.jpg': 'foto 2', '../fora.jpg': 'x' };
  const sb = {
    storage: {
      from: () => ({
        list: async (prefixo) => {
          if (prefixo === '') return { data: [{ name: 'cbtu', id: null }, { name: 'ubs', id: null }, { name: '../fora.jpg', id: 'z' }], error: null };
          return { data: Object.keys(arquivos).filter((c) => c.startsWith(`${prefixo}/`)).map((c) => ({ name: c.slice(prefixo.length + 1), id: c })), error: null };
        },
        download: async (c) => ({ data: new Blob([arquivos[c]]), error: null }),
      }),
    },
  };
  const pasta = await mkdtemp(join(tmpdir(), 'bkf-'));
  const r = await fazerBackupFotos(sb, pasta);
  assert.equal(r.arquivos, 2);
  assert.deepEqual(r.ignorados, ['../fora.jpg']);
  assert.equal(await readFile(join(pasta, 'arquivos', 'cbtu', 'f1.jpg'), 'utf8'), 'foto 1');
});
