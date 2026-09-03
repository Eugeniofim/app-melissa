-- ============================================================
-- Deixar a Melissa apagar reserva pelo painel
-- Cole no SQL Editor do Supabase e clique em Run. Roda em 1 segundo.
-- Painel: https://supabase.com/dashboard/project/kqphzdowtjcewazikzyn/sql/new
--
-- Por que precisa: a trava do banco (RLS) tem regra para criar, ler e
-- alterar reserva, mas nenhuma para APAGAR. Sem regra, o banco recusa —
-- e recusa devolvendo 200, sem erro nenhum. O app conta as linhas
-- apagadas e avisa quando volta zero, mas quem destrava é esta linha.
--
-- Só a dona do app apaga. Visitante do site continua sem poder nada.
-- ============================================================

drop policy if exists bk_delete_owner on bookings;
create policy bk_delete_owner on bookings
  for delete to authenticated
  using (is_owner());

-- conferência: tem que aparecer bk_delete_owner na lista
select policyname, cmd from pg_policies
 where tablename = 'bookings' order by policyname;
