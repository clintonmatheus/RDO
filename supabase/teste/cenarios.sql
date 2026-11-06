-- Cenários de permissão. Qualquer falha interrompe com erro.
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@x.com', '{"nome":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@x.com', '{}'),
  ('00000000-0000-0000-0000-0000000000ad', 'adm@x.com', '{"nome":"Clinton"}');
\i supabase/002_administrador.sql
update public.perfis set admin = true where id = '00000000-0000-0000-0000-0000000000ad';

do $$ begin
  assert (select nome from public.perfis where id = '00000000-0000-0000-0000-00000000000a') = 'Ana', 'perfil com nome';
  assert (select nome from public.perfis where id = '00000000-0000-0000-0000-00000000000b') = 'beto', 'perfil sem nome usa e-mail';
end $$;

-- Ana cria registro e anotação
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.registros (obra_id, data, atualizado_por, dados) values ('ubs', '2026-11-06', auth.uid(), '{"x":1}');
insert into public.anotacoes (id, obra_id, data, autor_id, dados) values ('n1', 'ubs', '2026-11-06', auth.uid(), '{"texto":"Reboco"}');
insert into public.fotos (id, obra_id, data, autor_id, caminho, dados) values ('f1', 'ubs', '2026-11-06', auth.uid(), 'ubs/f1.jpg', '{}');
insert into storage.objects (bucket_id, name) values ('fotos', 'ubs/f1.jpg');

-- Ana não cria anotação em nome de outro
do $$ begin
  begin
    insert into public.anotacoes (id, obra_id, data, autor_id, dados) values ('n2', 'ubs', '2026-11-06', '00000000-0000-0000-0000-00000000000b', '{}');
    raise exception 'FALHA: criou anotação em nome de outro';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Beto altera o registro (permitido) mas não a anotação da Ana
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.registros (obra_id, data, atualizado_por, dados) values ('ubs', '2026-11-06', auth.uid(), '{"x":2}')
  on conflict (obra_id, data) do update set dados = excluded.dados, atualizado_por = excluded.atualizado_por;
do $$ declare n int; begin
  update public.anotacoes set dados = '{"texto":"hack"}' where id = 'n1';
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: Beto alterou anotação da Ana';
  update public.fotos set excluida = true where id = 'f1';
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: Beto excluiu foto da Ana';
  assert (select count(*) from public.anotacoes) = 1, 'Beto lê anotações';
end $$;

-- Upsert do Beto sobre anotação da Ana (como o app faz) é bloqueado
do $$ begin
  begin
    insert into public.anotacoes (id, obra_id, data, autor_id, dados) values ('n1', 'ubs', '2026-11-06', '00000000-0000-0000-0000-00000000000a', '{"texto":"hack"}')
      on conflict (id) do update set dados = excluded.dados;
    raise exception 'FALHA: upsert do Beto passou';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Administrador altera a anotação da Ana via upsert; o autor continua sendo a Ana
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', false);
insert into public.anotacoes (id, obra_id, data, autor_id, dados, excluida) values ('n1', 'ubs', '2026-11-06', '00000000-0000-0000-0000-00000000000a', '{"texto":"Reboco interno"}', true)
  on conflict (id) do update set dados = excluded.dados, excluida = excluded.excluida;

-- A própria Ana altera a sua (permitido) e não consegue trocar o autor
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.fotos set excluida = true where id = 'f1';
reset role;
do $$ begin
  assert (select dados->>'texto' from public.anotacoes where id = 'n1') = 'Reboco interno', 'admin editou';
  assert (select autor_id from public.anotacoes where id = 'n1') = '00000000-0000-0000-0000-00000000000a', 'autor mantido';
  assert (select excluida from public.fotos where id = 'f1'), 'Ana excluiu a própria foto';
  assert (select atualizado_por from public.registros) = '00000000-0000-0000-0000-00000000000b', 'última gravação do registro é do Beto';
  assert (select dados->>'x' from public.registros) = '2', 'registro atualizado';
  assert (select count(*) from pg_publication_tables where pubname = 'supabase_realtime') = 3, 'tempo real nas 3 tabelas';
end $$;

-- Usuário não logado não lê nada
set role anon;
do $$ begin
  begin
    perform 1 from public.anotacoes;
    raise exception 'FALHA: anônimo leu anotações';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'TODOS OS CENÁRIOS PASSARAM' as resultado;
