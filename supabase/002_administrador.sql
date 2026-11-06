-- Torna um usuário administrador (troque o e-mail). Rode depois de criar o usuário em Authentication → Users.
update public.perfis set admin = true
where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI');

-- Para conferir:
-- select u.email, p.nome, p.admin from public.perfis p join auth.users u on u.id = p.id order by u.email;
