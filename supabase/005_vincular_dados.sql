-- Conteúdo coerente com a linha (achado da auditoria completa). Rode uma vez no SQL Editor, depois da 004.
-- É seguro rodar de novo. Vale só para gravações novas: os registros que já existem não são conferidos.
-- O servidor confere o autor pelas colunas da linha, mas os aparelhos liam o conteúdo (dados). Um usuário podia gravar
-- uma linha própria cujo conteúdo dizia ser a anotação ou foto de outra pessoa e assim trocar o texto, o autor ou
-- esconder o original em todos os aparelhos. Agora o id, a obra, o dia, o autor e a exclusão do conteúdo precisam ser
-- iguais aos da linha, e o id só pode ter letras, números, "-" e "_" (ele vira nome de arquivo no celular).

create or replace function public.vincular_dados() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb := new.dados;
begin
  if jsonb_typeof(d) is distinct from 'object' then raise exception 'Conteúdo inválido'; end if;
  if tg_table_name = 'registros' then
    if d ->> 'obraId' is distinct from new.obra_id or d ->> 'data' is distinct from new.data::text
       or d ->> 'id' is distinct from new.obra_id || '|' || new.data::text then
      raise exception 'Conteúdo do registro não corresponde à obra e ao dia da linha';
    end if;
    return new;
  end if;
  if new.id !~ '^[A-Za-z0-9_-]{1,100}$' or d ->> 'id' is distinct from new.id
     or d ->> 'obraId' is distinct from new.obra_id or d ->> 'data' is distinct from new.data::text
     or coalesce((d ->> 'excluida')::boolean, false) is distinct from new.excluida
     or (d ? 'autorId' and d ->> 'autorId' is distinct from new.autor_id::text)
     or (tg_table_name = 'anotacoes' and (d ->> 'autorId' is null or jsonb_typeof(d -> 'texto') is distinct from 'string'
         or jsonb_typeof(d -> 'criadaEm') is distinct from 'string'))
     or (tg_table_name = 'fotos' and (jsonb_typeof(d -> 'capturadaEm') is distinct from 'string'
         or (d ? 'caminhoRemoto' and d ->> 'caminhoRemoto' is distinct from to_jsonb(new) ->> 'caminho'))) then
    raise exception 'Conteúdo não corresponde à linha (id, obra, dia, autor ou exclusão)';
  end if;
  return new;
end $$;

-- O nome "vincular" faz este gatilho rodar depois de manter_autor (que devolve o autor original numa alteração).
do $$
declare t text;
begin
  foreach t in array array['registros', 'anotacoes', 'fotos'] loop
    execute format('drop trigger if exists vincular_dados on public.%I', t);
    execute format('create trigger vincular_dados before insert or update on public.%I for each row execute function public.vincular_dados()', t);
  end loop;
end $$;
