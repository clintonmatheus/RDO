-- RDO — esquema do servidor (Supabase). Rode uma vez no SQL Editor do projeto.
-- Tabelas guardam o objeto do app em "dados" (jsonb) + colunas-chave para permissões e consultas.

-- 1. Perfis dos usuários (nome exibido e administrador)
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  admin boolean not null default false,
  criado_em timestamptz not null default now()
);

create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select admin from public.perfis where id = auth.uid()), false)
$$;

-- 2. Dados do diário
create table if not exists public.registros (
  obra_id text not null,
  data date not null,
  atualizado_por uuid not null references auth.users (id),
  dados jsonb not null,
  servidor_em timestamptz not null default now(),
  primary key (obra_id, data)
);

create table if not exists public.anotacoes (
  id text primary key,
  obra_id text not null,
  data date not null,
  autor_id uuid not null references auth.users (id),
  excluida boolean not null default false,
  dados jsonb not null,
  servidor_em timestamptz not null default now()
);

create table if not exists public.fotos (
  id text primary key,
  obra_id text not null,
  data date not null,
  autor_id uuid not null references auth.users (id),
  caminho text,
  excluida boolean not null default false,
  dados jsonb not null,
  servidor_em timestamptz not null default now()
);

create index if not exists idx_registros_servidor_em on public.registros (servidor_em);
create index if not exists idx_anotacoes_servidor_em on public.anotacoes (servidor_em);
create index if not exists idx_fotos_servidor_em on public.fotos (servidor_em);

-- Horário do servidor em cada gravação (usado pelos aparelhos para baixar só o que mudou)
create or replace function public.marcar_servidor_em() returns trigger
language plpgsql as $$
begin
  new.servidor_em := clock_timestamp();
  return new;
end $$;

drop trigger if exists marcar_registros on public.registros;
create trigger marcar_registros before insert or update on public.registros
  for each row execute function public.marcar_servidor_em();
drop trigger if exists marcar_anotacoes on public.anotacoes;
create trigger marcar_anotacoes before insert or update on public.anotacoes
  for each row execute function public.marcar_servidor_em();
drop trigger if exists marcar_fotos on public.fotos;
create trigger marcar_fotos before insert or update on public.fotos
  for each row execute function public.marcar_servidor_em();

-- Autor de anotação/foto não pode ser trocado depois de criado
create or replace function public.manter_autor() returns trigger
language plpgsql as $$
begin
  new.autor_id := old.autor_id;
  return new;
end $$;

drop trigger if exists manter_autor_anotacoes on public.anotacoes;
create trigger manter_autor_anotacoes before update on public.anotacoes
  for each row execute function public.manter_autor();
drop trigger if exists manter_autor_fotos on public.fotos;
create trigger manter_autor_fotos before update on public.fotos
  for each row execute function public.manter_autor();

-- 3. Permissões (RLS)
alter table public.perfis enable row level security;
alter table public.registros enable row level security;
alter table public.anotacoes enable row level security;
alter table public.fotos enable row level security;

drop policy if exists "perfis: leitura" on public.perfis;
create policy "perfis: leitura" on public.perfis for select to authenticated using (true);

-- Registro do dia: qualquer usuário lê e altera; quem grava fica registrado como autor da alteração
drop policy if exists "registros: leitura" on public.registros;
create policy "registros: leitura" on public.registros for select to authenticated using (true);
drop policy if exists "registros: criar" on public.registros;
create policy "registros: criar" on public.registros for insert to authenticated
  with check (atualizado_por = auth.uid());
drop policy if exists "registros: alterar" on public.registros;
create policy "registros: alterar" on public.registros for update to authenticated
  using (true) with check (atualizado_por = auth.uid());

-- Anotações e fotos: todos leem; cada um cria em seu nome; só autor ou administrador altera/exclui
-- (o administrador também passa no "criar" porque o app grava com upsert)
drop policy if exists "anotacoes: leitura" on public.anotacoes;
create policy "anotacoes: leitura" on public.anotacoes for select to authenticated using (true);
drop policy if exists "anotacoes: criar" on public.anotacoes;
create policy "anotacoes: criar" on public.anotacoes for insert to authenticated
  with check (autor_id = auth.uid() or public.eh_admin());
drop policy if exists "anotacoes: alterar" on public.anotacoes;
create policy "anotacoes: alterar" on public.anotacoes for update to authenticated
  using (autor_id = auth.uid() or public.eh_admin())
  with check (autor_id = auth.uid() or public.eh_admin());

drop policy if exists "fotos: leitura" on public.fotos;
create policy "fotos: leitura" on public.fotos for select to authenticated using (true);
drop policy if exists "fotos: criar" on public.fotos;
create policy "fotos: criar" on public.fotos for insert to authenticated
  with check (autor_id = auth.uid() or public.eh_admin());
drop policy if exists "fotos: alterar" on public.fotos;
create policy "fotos: alterar" on public.fotos for update to authenticated
  using (autor_id = auth.uid() or public.eh_admin())
  with check (autor_id = auth.uid() or public.eh_admin());

-- 4. Arquivos das fotos (privado; só usuários logados)
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
  on conflict (id) do nothing;

drop policy if exists "fotos arquivos: leitura" on storage.objects;
create policy "fotos arquivos: leitura" on storage.objects for select to authenticated
  using (bucket_id = 'fotos');
drop policy if exists "fotos arquivos: enviar" on storage.objects;
create policy "fotos arquivos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos');
drop policy if exists "fotos arquivos: substituir" on storage.objects;
create policy "fotos arquivos: substituir" on storage.objects for update to authenticated
  using (bucket_id = 'fotos') with check (bucket_id = 'fotos');

-- 5. Tempo real
do $$
begin
  begin alter publication supabase_realtime add table public.registros; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.anotacoes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.fotos; exception when duplicate_object then null; end;
end $$;
