-- Cenários da 004 (auditoria e arquivos de fotos). Roda depois de cenarios.sql. Qualquer falha interrompe com erro.
\set ON_ERROR_STOP on
\i supabase/004_auditoria_e_fotos.sql
\i supabase/004_auditoria_e_fotos.sql

-- Ana envia uma foto nova; Beto sobrescreve o registro do dia
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into storage.objects (bucket_id, name) values ('fotos', 'ubs/f9.jpg');
insert into public.registros (obra_id, data, atualizado_por, dados) values ('ubs', '2026-11-09', auth.uid(), '{"x":1}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update public.registros set dados = '{"x":99}', atualizado_por = auth.uid() where obra_id = 'ubs' and data = '2026-11-09';

-- Beto não substitui o arquivo da foto da Ana
do $$ declare n int; begin
  update storage.objects set name = name where bucket_id = 'fotos' and name = 'ubs/f9.jpg';
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: Beto substituiu a foto da Ana';
end $$;

-- Beto não lê a auditoria
do $$ begin
  begin
    perform 1 from public.auditoria;
    raise exception 'FALHA: usuário leu a auditoria';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A Ana substitui o próprio arquivo e o administrador substitui qualquer um
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare n int; begin
  update storage.objects set name = name where bucket_id = 'fotos' and name = 'ubs/f9.jpg';
  get diagnostics n = row_count;
  assert n = 1, 'Ana substitui a própria foto';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', false);
do $$ declare n int; begin
  update storage.objects set name = name where bucket_id = 'fotos' and name = 'ubs/f9.jpg';
  get diagnostics n = row_count;
  assert n = 1, 'administrador substitui qualquer foto';
end $$;
reset role;

-- A auditoria guarda a versão da Ana que o Beto sobrescreveu
do $$ begin
  assert (select antes -> 'dados' ->> 'x' from public.auditoria
           where tabela = 'registros' and registro = 'ubs/2026-11-09' and acao = 'alterou') = '1', 'versão anterior guardada';
  assert (select por from public.auditoria
           where tabela = 'registros' and registro = 'ubs/2026-11-09' and acao = 'alterou') = '00000000-0000-0000-0000-00000000000b', 'autor da alteração';
end $$;

-- Quem não fez login não chama as funções auxiliares
set role anon;
do $$ begin
  begin
    perform public.eh_admin();
    raise exception 'FALHA: anônimo chamou eh_admin';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'CENÁRIOS DA 004 PASSARAM' as resultado;
