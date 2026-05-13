-- RR Digital App — V1 initial schema
-- All UUIDs generated server-side via pgcrypto.

create extension if not exists pgcrypto;

-- =========================================================================
-- users
-- =========================================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  global_role text not null default 'user',
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_global_role_check
    check (global_role in ('superadmin', 'user')),
  constraint users_status_check
    check (status in ('active', 'disabled'))
);

-- =========================================================================
-- companies
-- =========================================================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_status_check
    check (status in ('active', 'inactive', 'suspended'))
);

-- =========================================================================
-- company_users (membership pivot)
-- =========================================================================
create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id),
  constraint company_users_role_check
    check (role in ('admin', 'user')),
  constraint company_users_status_check
    check (status in ('active', 'disabled'))
);

create index company_users_user_id_idx
  on company_users(user_id);

-- =========================================================================
-- projects
-- =========================================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  type text not null default 'custom',
  status text not null default 'active',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_type_check
    check (type in ('website', 'ecommerce', 'mobile_app', 'dashboard', 'automation', 'ai', 'custom')),
  constraint projects_status_check
    check (status in ('active', 'maintenance', 'draft', 'archived'))
);

create index projects_company_id_idx
  on projects(company_id);

-- =========================================================================
-- project_metrics
-- =========================================================================
create table project_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  metric_value numeric not null,
  metric_unit text not null default 'count',
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  constraint project_metrics_unit_check
    check (metric_unit in ('count', 'cents', 'percent', 'seconds', 'custom'))
);

create index project_metrics_company_project_period_idx
  on project_metrics(company_id, project_id, period_start);

-- =========================================================================
-- events
-- =========================================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  type text not null,
  title text not null,
  description text,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_severity_check
    check (severity in ('info', 'success', 'warning', 'error'))
);

create index events_company_created_idx
  on events(company_id, created_at desc);

-- =========================================================================
-- notifications
-- =========================================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_company_user_read_idx
  on notifications(company_id, user_id, read_at);

-- =========================================================================
-- support_requests
-- =========================================================================
create table support_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by_user_id uuid not null references users(id) on delete restrict,
  title text not null,
  message text not null,
  type text not null default 'other',
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_type_check
    check (type in ('technical', 'modification', 'billing', 'other')),
  constraint support_requests_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint support_requests_status_check
    check (status in ('open', 'in_progress', 'resolved', 'closed'))
);

create index support_requests_company_status_created_idx
  on support_requests(company_id, status, created_at desc);

-- =========================================================================
-- invitations
-- =========================================================================
create table invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  role text not null default 'user',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index invitations_email_idx
  on invitations(email);

-- =========================================================================
-- device_tokens
-- =========================================================================
create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform text not null,
  expo_push_token text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint device_tokens_platform_check
    check (platform in ('ios', 'android', 'web'))
);
