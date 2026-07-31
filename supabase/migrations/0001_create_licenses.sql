-- Licencas de ativacao do Sistema de Optotipos Snellen.
-- Uma chave e vinculada a um unico hardware_id na primeira ativacao.

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  customer_name text,
  customer_email text,
  hardware_id text,
  status text not null default 'unused' check (status in ('unused', 'active', 'blocked')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  last_check_at timestamptz
);

create index if not exists licenses_license_key_idx on public.licenses (license_key);

alter table public.licenses enable row level security;

-- Nenhuma policy publica: apenas a service role (usada pela Edge Function) acessa esta tabela.
-- O client nunca fala diretamente com a tabela, apenas com a Edge Function "validate-license".
