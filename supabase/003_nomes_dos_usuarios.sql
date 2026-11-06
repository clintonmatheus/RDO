-- Define o nome exibido de cada usuário (aparece nas anotações). Troque e-mails e nomes e rode.
update public.perfis p set nome = v.nome
from (values
  ('email1@exemplo.com', 'Nome do Mestre 1'),
  ('email2@exemplo.com', 'Nome do Mestre 2'),
  ('email3@exemplo.com', 'Nome do Encarregado 1'),
  ('email4@exemplo.com', 'Nome do Encarregado 2'),
  ('email5@exemplo.com', 'Nome do Encarregado 3')
) as v(email, nome)
join auth.users u on u.email = v.email
where p.id = u.id;

select u.email, p.nome, p.admin from public.perfis p join auth.users u on u.id = p.id order by u.email;
