-- APP DA MELISSA NA SALA 'melissa' — o KIT DA VIAGEM com link curto e sempre atualizado (27/10/2026).
-- Quem roda é você. Vale para quando o app estiver na sala (v1.64.0 em diante: o banco no projeto da Ti Artes).
-- Onde: supabase.com → projeto da Ti Artes (uopfqlogjzuqpabptxkb) → SQL Editor → New query → colar tudo → Run.
--
-- O mesmo do LIGAR-KIT-MELISSA.sql, mas dentro da sala dela (schema melissa), com a dona da sala
-- (melissa.is_owner()). Não mexe em nada que já existe. Sem isto, o app usa o link comprido.

create table if not exists melissa.kits (
  token text primary key check (token ~ '^[A-Za-z0-9]{8,32}$'),
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table melissa.kits enable row level security;

drop policy if exists kits_dona on melissa.kits;
create policy kits_dona on melissa.kits for all to authenticated
  using (melissa.is_owner()) with check (melissa.is_owner());

grant select, insert, update, delete on melissa.kits to authenticated;
revoke all on melissa.kits from anon;
grant all on melissa.kits to service_role;

-- o cliente: lê só o kit do código que ele recebeu
create or replace function melissa.kit(p_token text) returns jsonb
  language sql stable security definer set search_path = melissa, public
as $$ select dados from melissa.kits where token = p_token $$;
revoke all on function melissa.kit(text) from public;
grant execute on function melissa.kit(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- conferir: tem que aparecer tabela 1 e funcao 1
select 'tabela' as o_que, count(*) from information_schema.tables where table_schema = 'melissa' and table_name = 'kits'
union all
select 'funcao', count(*) from information_schema.routines where routine_schema = 'melissa' and routine_name = 'kit';
