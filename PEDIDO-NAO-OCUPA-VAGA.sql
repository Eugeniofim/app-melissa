-- ============================================================
-- Pedido sem pagamento nao ocupa vaga (regra da Melissa, 21/09/2026)
-- Cole no SQL Editor do Supabase e clique em Run. Roda em 1 segundo.
-- Painel: https://supabase.com/dashboard/project/kqphzdowtjcewazikzyn/sql/new
--
-- A contagem publica de vagas (o que o visitante ve) somava toda reserva
-- nao cancelada. Agora reserva do site nasce como 'pending' (pedido) e so
-- vira 'confirmed' quando o dinheiro entra. Sem esta troca, o pedido de
-- quem nao pagou continuaria roubando vaga na tela dos outros clientes.
-- ============================================================
create or replace view seat_counts as
  select data->>'tourId' as tour_id,
         data->>'date'   as date,
         data->>'time'   as time,
         sum((data->>'pax')::int) as pax
  from bookings
  where coalesce(data->>'status','confirmed') = 'confirmed'
  group by 1,2,3;
alter view seat_counts set (security_invoker = off);
grant select on seat_counts to anon, authenticated;
select 'pronto' as status;
