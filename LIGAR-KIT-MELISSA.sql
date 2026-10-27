-- APP DA MELISSA — o KIT DA VIAGEM com link curto e sempre atualizado (27/10/2026). Quem roda é você.
-- Onde: supabase.com → projeto "app-melissa" (kqphzdowtjcewazikzyn, o banco dela de hoje) → SQL Editor
--       → New query → colar tudo → Run.   https://supabase.com/dashboard/project/kqphzdowtjcewazikzyn/sql/new
--
-- O que faz: uma tabela só para os kits (uma linha por cliente que recebeu o link curto). O cliente lê
-- UM kit pelo código do link (a função kit), nunca a tabela inteira. Só a dona (o login do painel) grava.
-- Não mexe em nada que já existe. Sem isto, o app usa o link comprido (funciona, mas não se atualiza).
-- O e-mail de confirmação NÃO depende disto (o kit vai dentro do link).
-- Quando o banco virar a sala 'melissa' no projeto da Ti Artes, rode lá o LIGAR-KIT-MELISSA-SALA.sql.

create table if not exists public.kits (
  token text primary key check (token ~ '^[A-Za-z0-9]{8,32}$'),
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.kits enable row level security;

drop policy if exists kits_dona on public.kits;
create policy kits_dona on public.kits for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant select, insert, update, delete on public.kits to authenticated;
revoke all on public.kits from anon;

-- o cliente: lê só o kit do código que ele recebeu
create or replace function public.kit(p_token text) returns jsonb
  language sql stable security definer set search_path = public
as $$ select dados from public.kits where token = p_token $$;
revoke all on function public.kit(text) from public;
grant execute on function public.kit(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- conferir: tem que aparecer tabela 1 e funcao 1
select 'tabela' as o_que, count(*) from information_schema.tables where table_schema = 'public' and table_name = 'kits'
union all
select 'funcao', count(*) from information_schema.routines where routine_schema = 'public' and routine_name = 'kit';
