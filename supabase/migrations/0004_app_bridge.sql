-- =============================================================================
-- 0004_app_bridge.sql  —  Puentes entre el esquema de producción y la app actual.
--
-- La app (hoy simulada en lib/store.ts) necesita algunas cosas que el esquema
-- base (0001-0003) no modelaba 1:1:
--   1. estado 'en_curso'  — el cliente sentado en el sillón (vista Cola).
--   2. profiles.avatar_url — avatar que arma cada usuario (clientes y barberos).
--   3. payments.kind/method — distinguir seña vs saldo y efectivo vs MercadoPago,
--      para el registro de cobros del panel (el esquema base es MercadoPago-first).
--
-- Nota sobre 'en_curso' y ocupación: el constraint no_double_booking y la RPC
-- slots_publicos consideran 'ocupantes' a (hold, confirmada, completada, no_show).
-- 'en_curso' es el turno que se está atendiendo AHORA (slot pasado/presente, nunca
-- ofrecible por min_lead), así que no hace falta sumarlo a esos conjuntos para v1.
-- =============================================================================

-- 1. Nuevo estado 'en_curso' (después de 'confirmada' en el orden del enum).
--    ADD VALUE en PG15 puede correr en transacción; el valor se usa recién en
--    runtime, no en esta migración.
alter type public.appointment_status add value if not exists 'en_curso' after 'confirmada';

-- 2. Avatar del usuario (DiceBear u otra URL). Lo edita el dueño de su profile.
alter table public.profiles add column if not exists avatar_url text;

-- 3. Tipo de pago y método, para el registro de cobros del panel.
do $$ begin
  create type public.payment_kind as enum ('sena', 'saldo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('efectivo', 'mercadopago');
exception when duplicate_object then null; end $$;

alter table public.payments add column if not exists kind   public.payment_kind;
alter table public.payments add column if not exists method public.payment_method;

-- Los cobros en efectivo/registro manual se insertan con is_current = false para
-- no chocar con el índice único parcial payments_one_current_idx (que reserva una
-- sola preference MP "vigente" por turno). Se documenta acá como convención.
comment on column public.payments.kind   is 'seña o saldo (NULL = pago MercadoPago clásico)';
comment on column public.payments.method is 'efectivo o mercadopago (medio del cobro registrado)';
