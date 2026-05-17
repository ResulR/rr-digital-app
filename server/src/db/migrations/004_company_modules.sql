-- RR Digital App — Company modules
-- Stores which feature modules are active for each company.
-- module_key values (e.g. 'project_metrics', 'restaurant_orders') are
-- free-text keys validated at the application level, not via DB constraint,
-- so new modules can be added without schema changes.
-- config holds module-specific settings (API URLs, identifiers, etc.).
-- Never store plaintext credentials in config — use an external secret store.

-- =========================================================================
-- company_modules
-- =========================================================================
create table company_modules (
  id          uuid      primary key default gen_random_uuid(),
  company_id  uuid      not null references companies(id) on delete cascade,
  module_key  text      not null,
  config      jsonb     not null default '{}'::jsonb,
  active      boolean   not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint company_modules_module_key_not_empty
    check (module_key <> ''),
  unique (company_id, module_key)
);

-- Fast lookup of all modules for a given company.
create index company_modules_company_id_idx
  on company_modules(company_id);

-- Useful for querying which companies have a given module.
create index company_modules_module_key_idx
  on company_modules(module_key);

-- Partial index: only active modules — the hot path in /auth/me.
create index company_modules_company_active_idx
  on company_modules(company_id)
  where active = true;
