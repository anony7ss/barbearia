# Auditoria de seguranca

Data: 2026-04-16

Atualizacao: 2026-04-17 - hardening aplicado em `202604170001_security_hardening.sql`.

## Superficies publicas

- Paginas institucionais publicas.
- `POST /api/booking/availability`
- `POST /api/booking/appointments`
- `POST /api/booking/lookup`
- `GET/PATCH/DELETE /api/booking/appointments/[id]`
- `POST /api/contact`

## Controles implementados

- Supabase Auth para contas.
- Route handlers validam payloads com Zod.
- Service role fica apenas em codigo server-side.
- Convidados consultam por codigo+contato ou token seguro.
- Token de convidado e salvo como SHA-256.
- Token de convidado e trocado por cookie HttpOnly no fluxo principal; links antigos com token redirecionam para URL limpa.
- Recalculo de disponibilidade no servidor antes de inserir ou reagendar.
- Constraint `appointments_no_overlap` impede conflito mesmo em corrida.
- Rate limit por funcao SQL `check_rate_limit`.
- Honeypot no formulario de contato.
- Headers de seguranca em `next.config.ts`.
- `.env.example` usa placeholders e `.gitignore` permite apenas o exemplo.

## RLS

RLS ativada em:

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

## Leitura por papel

- Visitante: servicos/barbeiros ativos e configuracoes publicas.
- Visitante: nao le `appointments` diretamente.
- Cliente autenticado: le apenas seus proprios agendamentos.
- Admin: gerencia dados operacionais via role derivada da sessao.

## Mutacoes criticas

- Criacao de agendamento passa por API server-side.
- Cancelamento/reagendamento exige ownership autenticado ou token de convidado.
- CRUD admin exige `profiles.role = 'admin'` ou registro em `admin_users`.
- Contato nao permite insert anonimo direto por RLS; somente route handler/service role.

## Limitacoes restantes

- `npm run typecheck`, `npm run build` e `npm audit` passaram sem vulnerabilidades reportadas.
- Email esta preparado com Resend, mas exige `RESEND_API_KEY`.
- WhatsApp esta preparado no modelo e copy, mas nao chama API externa.
- Primeiro admin exige promocao manual segura no SQL editor.
- Recomenda-se adicionar monitoramento/observabilidade no deploy real.

## Observacao sobre segredo

Durante auditoria local foi encontrado um valor com formato de chave Supabase em `.env.example`; o arquivo foi sanitizado. Se esse valor era real, rotacione as chaves do projeto Supabase antes de colocar em producao.
