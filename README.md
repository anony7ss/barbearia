# Corte Nobre Barbearia

Sistema completo para uma barbearia premium com site institucional, agendamento sem conta, area do cliente, painel administrativo e Supabase com migrations/RLS.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Framer Motion
- Supabase Auth + PostgreSQL
- Zod
- React Hook Form
- Resend preparado para emails transacionais
- Vercel-ready

## Rodando localmente

Instale as dependencias extras declaradas no `package.json`:

```bash
npm install
```

Crie o arquivo de ambiente:

```bash
copy .env.example .env.local
```

Preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` e `EMAIL_FROM` para confirmacao transacional de agendamento em producao
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` para CAPTCHA em producao

Suba o banco no Supabase:

```bash
supabase db push
supabase db seed
```

Se estiver usando apenas o painel web do Supabase, aplique as migrations em
`SQL Editor` na ordem dos arquivos em `supabase/migrations` e depois cole o
conteudo de `supabase/seed.sql` em uma nova query.

Inicie o projeto:

```bash
npm run dev
```

## Rotas principais

- `/` Home premium com CTA de agendamento
- `/servicos`
- `/equipe`
- `/agendamento`
- `/meus-agendamentos`
- `/sobre`
- `/contato`
- `/privacidade`
- `/termos`
- `/login`
- `/cadastro`
- `/admin`
- `/admin/agenda`
- `/admin/servicos`
- `/admin/barbeiros`
- `/admin/clientes`
- `/admin/disponibilidade`
- `/preferencias`

## Agendamento

O cliente pode agendar sem conta:

1. Escolhe servico
2. Escolhe barbeiro ou qualquer disponivel
3. Escolhe data/horario
4. Informa nome, email e telefone
5. Confirma

O servidor recalcula disponibilidade antes de inserir, considerando:

- duracao do servico
- barbeiro
- horarios de funcionamento
- intervalo/pausa
- bloqueios
- conflitos com agendamentos pendentes/confirmados
- antecedencia minima
- limite de dias futuros

## Sem conta

Agendamentos de convidados nao ficam publicos em tabela. A consulta acontece por:

- codigo + telefone/email
- link seguro com token hasheado no banco

## Segurança

Implementado:

- Supabase Auth
- RLS em tabelas sensiveis
- roles `client`, `barber`, `admin`
- politicas separadas para visitante, cliente e admin
- menor privilegio por padrao
- clientes autenticados leem apenas proprios agendamentos
- visitantes nao leem agendamentos diretamente
- route handlers validam entradas com Zod
- constraints no banco reforcam formato de email, telefone, URLs, hashes e limites de texto
- service role usado apenas no servidor
- tokens de convidado armazenados como SHA-256
- rate limiting via tabela/função PostgreSQL
- honeypot em formulario de contato
- Turnstile/CAPTCHA opcional para contato e criacao de agendamento
- rate limit separado por IP, contato, telefone e email em fluxos sensiveis
- headers de seguranca no `next.config.ts`
- CSP mais rigida em producao, sem `unsafe-eval`
- erros genericos em producao
- criacao de agendamento em producao falha fechado se Resend nao estiver configurado

## Emails transacionais

Ao confirmar um agendamento publico, o servidor tenta enviar imediatamente um
email de confirmacao via Resend para o email informado pelo cliente. Se o envio
falhar por erro temporario, o agendamento continua criado e um job de retry e
gravado em `notification_jobs` para o cron `/api/admin/notifications/process`.

Em producao, configure obrigatoriamente:

- `RESEND_API_KEY`
- `EMAIL_FROM` ou `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `CRON_SECRET` para processar retries/lembretes com autorizacao

## Banco

Veja `supabase/README.md` e as migrations em `supabase/migrations`.

Inclui:

- tabelas
- indices
- constraints
- trigger de `updated_at`
- trigger de criacao de perfil apos auth signup
- constraint anti-conflito de agenda com GiST
- policies RLS
- funcoes `security definer`
- views administrativas de receita, agenda e ocupacao
- preferencias de cliente, fila de espera, cupons, no-show e historico de status
- bucket/policies de storage para galeria aprovada
- seeds de servicos, barbeiros e regras de disponibilidade

## Primeiro admin

Crie um usuario pelo cadastro e promova no SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@seudominio.com'
);
```

## Deploy na Vercel

1. Crie projeto na Vercel.
2. Configure as variaveis de ambiente.
3. Aplique migrations/seeds no Supabase.
4. Rode build:

```bash
npm run build
```

## Novidades operacionais

- Pagina `/agendamento/sucesso` com codigo, calendario, WhatsApp e CTA de conta.
- Navbar orientada a sessao com menu de usuario e atalho admin.
- Reagendamento/cancelamento com regra de antecedencia validada no servidor.
- Admin agenda com visao diaria por barbeiro, mapa semanal e exportacao CSV.
- Paginas individuais de barbeiros em `/equipe/[slug]`.
