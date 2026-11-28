// Cópia dos dados do RDO.
// Uso (na tarefa agendada do GitHub):
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/backup/backup.mjs <pasta-de-saída>          tabelas e logins (todo dia)
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/backup/backup.mjs fotos <pasta-de-saída>    arquivos das fotos (toda semana)
// A chave secreta (service role) só existe nos "Secrets" do GitHub; nunca vai para o app nem para o código.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Tabelas e a chave de cada uma (usada para paginar sempre na mesma ordem). */
export const TABELAS = {
  perfis: ['id'],
  registros: ['obra_id', 'data'],
  anotacoes: ['id'],
  fotos: ['id'],
  auditoria: ['id'],
};
export const BUCKET = 'fotos';
const PAGINA = 1000;

const tabelaInexistente = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|Could not find the table/i.test(e.message ?? ''));

/** Todas as linhas de uma tabela, em páginas. Tabela que ainda não existe devolve null. */
export async function exportarTabela(sb, tabela, chave = TABELAS[tabela] ?? ['id']) {
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    let consulta = sb.from(tabela).select('*');
    for (const c of chave) consulta = consulta.order(c, { ascending: true });
    const { data, error } = await consulta.range(de, de + PAGINA - 1);
    if (error) { if (tabelaInexistente(error)) return null; throw new Error(`${tabela}: ${error.message}`); }
    linhas.push(...data);
    if (data.length < PAGINA) return linhas;
  }
}

/** Caminho de arquivo vindo do servidor que pode ser gravado com segurança dentro da pasta da cópia. */
export function caminhoSeguro(caminho) {
  const partes = String(caminho).split('/');
  return caminho.length > 0 && !caminho.startsWith('/') && !caminho.includes('\\')
    && partes.every((p) => p !== '' && p !== '.' && p !== '..');
}

/** Caminhos de todos os arquivos do bucket de fotos (as "pastas" são as obras). */
export async function listarArquivos(sb, prefixo = '') {
  const caminhos = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefixo, { limit: PAGINA, offset: de, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`arquivos: ${error.message}`);
    for (const x of data) {
      const caminho = prefixo ? `${prefixo}/${x.name}` : x.name;
      if (x.id === null || x.id === undefined) caminhos.push(...(await listarArquivos(sb, caminho))); // pasta
      else caminhos.push(caminho);
    }
    if (data.length < PAGINA) return caminhos;
  }
}

/** Copia os arquivos das fotos para `pasta/arquivos` e devolve o resumo (só contagens). */
export async function fazerBackupFotos(sb, pasta, agora = new Date()) {
  const resumo = { feito_em: agora.toISOString(), arquivos: 0, bytes: 0, ignorados: [] };
  for (const caminho of await listarArquivos(sb)) {
    if (!caminhoSeguro(caminho)) { resumo.ignorados.push(caminho); continue; }
    const { data, error } = await sb.storage.from(BUCKET).download(caminho);
    if (error) throw new Error(`arquivo ${caminho}: ${error.message}`);
    const bytes = Buffer.from(await data.arrayBuffer());
    await gravar(join(pasta, 'arquivos', caminho), bytes);
    resumo.arquivos += 1;
    resumo.bytes += bytes.length;
  }
  await gravar(join(pasta, 'resumo.json'), JSON.stringify(resumo, null, 1));
  return resumo;
}

/** Logins (e-mail e datas). Senhas não são exportáveis: numa restauração, cada pessoa recebe senha nova. */
export async function exportarUsuarios(sb) {
  const r = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await sb.auth.admin.listUsers({ page: pagina, perPage: PAGINA });
    if (error) throw new Error(`logins: ${error.message}`);
    r.push(...data.users.map((u) => ({ id: u.id, email: u.email, criado_em: u.created_at, ultimo_acesso: u.last_sign_in_at ?? null })));
    if (data.users.length < PAGINA) return r;
  }
}

async function gravar(caminho, conteudo) {
  await mkdir(dirname(caminho), { recursive: true });
  await writeFile(caminho, conteudo);
}

/** Faz a cópia em `pasta` e devolve o resumo (só contagens: os registros nunca vão para o log). */
export async function fazerBackup(sb, pasta, agora = new Date()) {
  const resumo = { feito_em: agora.toISOString(), tabelas: {}, ausentes: [], usuarios: 0 };
  for (const t of Object.keys(TABELAS)) {
    const linhas = await exportarTabela(sb, t);
    if (linhas === null) { resumo.ausentes.push(t); continue; }
    resumo.tabelas[t] = linhas.length;
    await gravar(join(pasta, 'dados', `${t}.json`), JSON.stringify(linhas));
  }
  const usuarios = await exportarUsuarios(sb);
  resumo.usuarios = usuarios.length;
  await gravar(join(pasta, 'usuarios.json'), JSON.stringify(usuarios, null, 1));
  await gravar(join(pasta, 'resumo.json'), JSON.stringify(resumo, null, 1));
  return resumo;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const soFotos = process.argv[2] === 'fotos';
  const pasta = (soFotos ? process.argv[3] : process.argv[2]) ?? 'backup';
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) { console.error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_KEY (Settings → Secrets and variables → Actions).'); process.exit(1); }
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  if (soFotos) {
    const f = await fazerBackupFotos(sb, pasta);
    console.log(`Cópia das fotos feita: ${f.arquivos} arquivos (${(f.bytes / 1e6).toFixed(1)} MB).`);
    if (f.ignorados.length) console.log(`${f.ignorados.length} arquivo(s) com nome inválido foram ignorados.`);
    process.exit(0);
  }
  const r = await fazerBackup(sb, pasta);
  console.log(`Backup feito: ${Object.entries(r.tabelas).map(([t, n]) => `${t} ${n}`).join(', ')}; ${r.usuarios} logins.`);
  if (r.ausentes.length) console.log(`Tabelas ainda não criadas: ${r.ausentes.join(', ')}`);
}
