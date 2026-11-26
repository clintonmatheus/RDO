// Restauração a partir de uma cópia (pasta já descriptografada e descompactada).
//   node scripts/backup/restaurar.mjs sql <pasta> [tabela …] > restaurar.sql
// Gera um SQL para rodar no SQL Editor do Supabase. Grava por cima (mesma chave) e não apaga nada.
// Os gatilhos ficam desligados só durante a restauração (session_replication_role = replica).
// Crie antes os logins (usuarios.json lista os e-mails); linhas de logins inexistentes são ignoradas.
// As fotos (arquivos) não fazem parte da cópia: ficam só no Supabase.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TABELAS } from './backup.mjs';

const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;
const LOTE = 200;

export async function gerarSql(pasta, tabelas = Object.keys(TABELAS)) {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const [modo, pasta, ...tabelas] = process.argv.slice(2);
  if (modo !== 'sql' || !pasta) { console.error('Uso: node scripts/backup/restaurar.mjs sql <pasta> [tabelas…] > restaurar.sql'); process.exit(1); }
  process.stdout.write(await gerarSql(pasta, tabelas.length ? tabelas : undefined));
}
