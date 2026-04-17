# Banco de dados Supabase

Este projeto usa migrations SQL rastreaveis em `supabase/migrations`.

## Aplicar localmente

1. Configure um projeto Supabase.
2. Copie `.env.example` para `.env.local` e preencha as chaves.
3. Rode as migrations:

```bash
supabase db push
```

4. Rode os seeds:

```bash
supabase db seed
```

## Aplicar pelo site do Supabase

Se voce nao estiver usando CLI:

1. Abra o projeto no Supabase.
2. Va em `SQL Editor`.
3. Crie uma query para cada arquivo em `supabase/migrations`, mantendo a ordem numerica:
   - `202604160001_initial_schema.sql`
   - `202604160002_product_security_features.sql`
   - `202604160003_admin_operations_security.sql`
   - `202604170001_security_hardening.sql`
   - `202604170002_input_validation_hardening.sql`
   - `202604170003_admin_access_hardening.sql`
4. Execute uma por vez.
5. Depois crie outra query com o conteudo de `supabase/seed.sql` e execute.

Nao edite migrations antigas depois de rodar em producao; crie sempre uma nova
arquivo incremental.

## Primeiro admin

Crie um usuario pelo fluxo de cadastro/login. Depois, no SQL editor do Supabase,
promova esse perfil:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@seudominio.com'
);
```

Opcionalmente registre tambem em `admin_users`.

## Seguranca

- RLS esta ativa em todas as tabelas sensiveis.
- Visitantes leem apenas servicos/barbeiros ativos e configuracoes publicas.
- Agendamentos nao sao legiveis por anon diretamente.
- Consulta sem conta deve passar por codigo+contato ou token seguro em API/RPC.
- Clientes autenticados leem apenas os proprios agendamentos.
- Mutacoes de cliente passam por route handlers com validacao Zod.
- Constraints incrementais validam email, telefone, URLs, hashes, codigos e limites de texto no banco.
- Admins sao derivados de `profiles.role = 'admin'` ou `admin_users`.
- `rate_limits` nao possui policy publica; acesso acontece via funcao `security definer`.
- Lookup de convidado pode usar a RPC `get_guest_appointment_details`, que retorna apenas o agendamento especifico quando codigo e contato batem.
- Historico de status, no-show, cupons, fila de espera e preferencias seguem RLS por ownership/admin.
- Storage usa bucket publico apenas para imagens aprovadas e escrita somente por admin.

## Tabelas principais

- `profiles`
- `admin_users`
- `barbers`
- `services`
- `business_settings`
- `availability_rules`
- `blocked_slots`
- `appointments`
- `appointment_guests`
- `notifications`
- `contact_messages`
- `audit_logs`
- `rate_limits`
- `client_preferences`
- `waitlist_entries`
- `coupons`
- `no_show_events`
- `appointment_status_history`

## Funcoes importantes

- `is_admin()`
- `check_rate_limit(...)`
- `get_guest_appointment(...)`
- `get_guest_appointment_details(...)`
- `get_appointment_by_guest_token(...)`
- `handle_new_user()`

## Views administrativas

- `admin_appointment_summary`
- `admin_revenue_by_day`
- `admin_barber_occupancy`
