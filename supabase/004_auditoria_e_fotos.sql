-- Segurança dos dados do RDO. Rode uma vez no SQL Editor, depois da 001. É seguro rodar de novo.
-- 1) Auditoria: toda criação, alteração ou exclusão em registros, anotações, fotos e perfis guarda a versão anterior
--    e a nova, quem fez e quando, numa tabela que o app não lê nem altera (só o SQL Editor). Serve para investigar e
--    para voltar um registro do dia que alguém sobrescreveu.
-- 2) Arquivos de fotos: só quem enviou a foto (ou o administrador) pode substituir o arquivo. Antes, qualquer login podia.
-- 3) Funções auxiliares deixam de responder a quem não fez login.

-- 1. Auditoria
create table if not exists public.auditoria (
  id bigserial primary key,
  tabela text not null,
  registro text not null,
  acao text not null check (acao in ('criou', 'alterou', 'apagou')),
  antes jsonb,
  depois jsonb,
  por uuid,
  em timestamptz not null default now()
);
create index if not exists idx_auditoria_registro on public.auditoria (tabela, registro, em desc);
create index if not exists idx_auditoria_em on public.auditoria (em desc);
alter table public.auditoria enable row level security; -- sem políticas: nenhum login do app lê ou grava aqui
revoke all on public.auditoria from anon, authenticated;
revoke all on sequence public.auditoria_id_seq from anon, authenticated;

create or replace function public.auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare a jsonb; d jsonb; x jsonb;
begin
  if tg_op <> 'INSERT' then a := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then d := to_jsonb(new); end if;
  -- gravação sem mudança real (só a hora do servidor) não entra
  if tg_op = 'UPDATE' and (a - 'servidor_em') = (d - 'servidor_em') then return null; end if;
  x := coalesce(d, a);
  insert into public.auditoria (tabela, registro, acao, antes, depois, por)
  values (tg_table_name,
          coalesce(x ->> 'id', (x ->> 'obra_id') || '/' || (x ->> 'data')),  -- registros: chave é obra + data
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'apagou' end, a, d, auth.uid());
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfis', 'registros', 'anotacoes', 'fotos'] loop
    execute format('drop trigger if exists auditar on public.%I', t);
    execute format('create trigger auditar after insert or update or delete on public.%I for each row execute function public.auditar()', t);
    -- "always": registra também durante uma restauração (quando os outros gatilhos ficam desligados)
    execute format('alter table public.%I enable always trigger auditar', t);
  end loop;
end $$;

-- 2. Arquivos das fotos: substituir só o próprio arquivo (o administrador pode todos).
--    owner_id é preenchido pelo próprio Supabase Storage com o login de quem enviou o arquivo.
drop policy if exists "fotos arquivos: substituir" on storage.objects;
create policy "fotos arquivos: substituir" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (owner_id = auth.uid()::text or public.eh_admin()))
  with check (bucket_id = 'fotos' and (owner_id = auth.uid()::text or public.eh_admin()));

-- 3. Funções auxiliares: só para quem fez login (o padrão do Postgres libera para todos)
revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- Consultas úteis (SQL Editor):
--   Últimas alterações:          select em, tabela, registro, acao, por from public.auditoria order by em desc limit 50;
--   História do registro do dia: select em, acao, antes -> 'dados' as antes, depois -> 'dados' as depois, por
--                                  from public.auditoria where tabela = 'registros' and registro = 'cbtu/2026-11-05' order by em;
--   Voltar o registro do dia:    update public.registros set dados = (select antes -> 'dados' from public.auditoria where id = <nº da linha>)
--                                  where obra_id = 'cbtu' and data = '2026-11-05';
