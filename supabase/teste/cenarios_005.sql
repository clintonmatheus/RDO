-- Cenários da 005 (conteúdo coerente com a linha). Roda depois de cenarios_004.sql. Qualquer falha interrompe com erro.
\set ON_ERROR_STOP on
\i supabase/005_vincular_dados.sql
\i supabase/005_vincular_dados.sql
set role authenticated;

-- Ana grava uma anotação normal (como o app grava)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.anotacoes (id, obra_id, data, autor_id, excluida, dados) values ('lx1-ana', 'ubs', '2026-11-10', auth.uid(), false,
  '{"id":"lx1-ana","obraId":"ubs","data":"2026-11-10","texto":"Concretagem","autorId":"00000000-0000-0000-0000-00000000000a","autorNome":"Ana","criadaEm":"2026-11-10T12:00:00Z","atualizadaEm":"2026-11-10T12:00:00Z","excluida":false}');

-- Beto não grava uma linha própria que se passa pela anotação da Ana, nem a esconde
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  begin
    insert into public.anotacoes (id, obra_id, data, autor_id, excluida, dados) values ('lx2-beto', 'ubs', '2026-11-10', auth.uid(), false,
      '{"id":"lx1-ana","obraId":"ubs","data":"2026-11-10","texto":"FORJADO","autorId":"00000000-0000-0000-0000-00000000000a","autorNome":"Ana","criadaEm":"2026-11-10T12:00:00Z","atualizadaEm":"2026-11-10T12:00:00Z","excluida":true}');
    raise exception 'FALHA: Beto gravou conteúdo que se passa pela anotação da Ana';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
  begin
    insert into public.anotacoes (id, obra_id, data, autor_id, excluida, dados) values ('lx3-beto', 'ubs', '2026-11-10', auth.uid(), false,
      '{"id":"lx3-beto","obraId":"ubs","data":"2026-11-10","texto":"x","autorId":"00000000-0000-0000-0000-00000000000a","autorNome":"Ana","criadaEm":"2026-11-10T12:00:00Z","excluida":false}');
    raise exception 'FALHA: Beto gravou anotação em nome da Ana';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
  begin
    insert into public.fotos (id, obra_id, data, autor_id, excluida, dados) values ('../x', 'ubs', '2026-11-10', auth.uid(), false,
      '{"id":"../x","obraId":"ubs","data":"2026-11-10","capturadaEm":"2026-11-10T12:00:00Z","excluida":false}');
    raise exception 'FALHA: entrou foto com id que vira caminho de arquivo';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
  begin
    insert into public.registros (obra_id, data, atualizado_por, dados) values ('ubs', '2026-11-11', auth.uid(), '{}');
    raise exception 'FALHA: entrou registro do dia vazio';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
end $$;

-- Registro do dia e foto normais continuam entrando
insert into public.registros (obra_id, data, atualizado_por, dados) values ('ubs', '2026-11-11', auth.uid(),
  '{"id":"ubs|2026-11-11","obraId":"ubs","data":"2026-11-11","efetivo":{},"equipamentos":{},"ritmo":"normal"}');
insert into public.fotos (id, obra_id, data, autor_id, caminho, excluida, dados) values ('lx4-beto', 'ubs', '2026-11-11', auth.uid(), 'ubs/lx4-beto.jpg', false,
  '{"id":"lx4-beto","obraId":"ubs","data":"2026-11-11","capturadaEm":"2026-11-11T12:00:00Z","caminhoRemoto":"ubs/lx4-beto.jpg","autorId":"00000000-0000-0000-0000-00000000000b","excluida":false}');
reset role;
select 'CENÁRIOS DA 005 PASSARAM' as resultado;
