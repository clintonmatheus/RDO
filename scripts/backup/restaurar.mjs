// Restauração a partir de uma cópia (pasta já descriptografada e descompactada).
//   node scripts/backup/restaurar.mjs sql <pasta> [tabela …] > restaurar.sql
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/backup/restaurar.mjs arquivos <pasta-da-cópia-das-fotos>
//     Envia de volta os arquivos das fotos (substitui se já existir).
// Gera um SQL para rodar no SQL Editor do Supabase. Grava por cima (mesma chave) e não apaga nada.
// Os gatilhos ficam desligados só durante a restauração (session_replication_role = replica).
// Crie antes os logins (usuarios.json lista os e-mails); linhas de logins inexistentes são ignoradas.
// A tabela auditoria fica de fora por padrão (é histórico, serve para consulta).
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { BUCKET, TABELAS, caminhoSeguro } from './backup.mjs';

const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const LOTE = 200;

export async function gerarSql(pasta, tabelas = Object.keys(TABELAS).filter((t) => t !== 'auditoria')) {
  const partes = ['-- Restauração gerada por scripts/backup/restaurar.mjs', 'begin;', 'set local session_replication_role = replica;'];
  for (const t of tabelas) {
    let linhas;
    try { linhas = JSON.parse(await readFile(join(pasta, 'dados', `${t}.json`), 'utf8')); } catch { continue; }
    if (!linhas.length) continue;
    partes.push(`-- ${t}: ${linhas.length}`);
    const chave = TABELAS[t].join(', ');
    for (let i = 0; i < linhas.length; i += LOTE) {
      const lote = JSON.stringify(linhas.slice(i, i + LOTE));
      const autor = { perfis: 'id', registros: 'atualizado_por' }[t] ?? 'autor_id';
      partes.push(`insert into public.${t} select * from json_populate_recordset(null::public.${t}, ${lit(lote)}::json) x where x.${autor} in (select id from auth.users)`
        + ` on conflict (${chave}) do update set ${colunas(linhas[0], TABELAS[t])};`);
    }
  }
  partes.push('commit;', '');
  return partes.join('\n');
}

const colunas = (linha, chave) => Object.keys(linha).filter((c) => !chave.includes(c)).map((c) => `${c} = excluded.${c}`).join(', ');

async function arquivosDaPasta(pasta) {
  const r = [];
  for (const nome of await readdir(pasta).catch(() => [])) {
    const c = join(pasta, nome);
    if ((await stat(c)).isDirectory()) r.push(...(await arquivosDaPasta(c))); else r.push(c);
  }
  return r;
}

/** Envia os arquivos das fotos de volta ao bucket (substitui se já existir). */
export async function restaurarArquivos(sb, pasta) {
  const base = join(pasta, 'arquivos');
  let n = 0;
  for (const c of await arquivosDaPasta(base)) {
    const caminho = relative(base, c).split('\\').join('/');
    if (!caminhoSeguro(caminho)) continue;
    const { error } = await sb.storage.from(BUCKET).upload(caminho, await readFile(c), { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`${caminho}: ${error.message}`);
    n += 1;
  }
  return n;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [modo, pasta, ...tabelas] = process.argv.slice(2);
  if (modo === 'sql' && pasta) process.stdout.write(await gerarSql(pasta, tabelas.length ? tabelas : undefined));
  else if (modo === 'arquivos' && pasta) {
    const url = process.env.SUPABASE_URL;
    const chave = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !chave) { console.error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_KEY.'); process.exit(1); }
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
    console.log(`${await restaurarArquivos(sb, pasta)} arquivos enviados.`);
  } else {
    console.error('Uso: node scripts/backup/restaurar.mjs sql <pasta> [tabelas…] > restaurar.sql\n'
      + '     SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/backup/restaurar.mjs arquivos <pasta>');
    process.exit(1);
  }
}
