-- RR Digital App — V1 demo seed data
-- All values are fictitious. Password hash is a placeholder and must be
-- replaced with a real bcrypt hash before production use.

-- =========================================================================
-- Admin user
-- =========================================================================
insert into users (email, password_hash, full_name, global_role, status)
values (
  'admin@example.com',
  '$2b$12$PLACEHOLDER_REPLACE_WITH_REAL_HASH',
  'RR Digital Admin',
  'superadmin',
  'active'
)
on conflict (email) do nothing;

-- =========================================================================
-- Companies
-- =========================================================================
insert into companies (name, status)
select 'Pasta House', 'active'
where not exists (select 1 from companies where name = 'Pasta House');

insert into companies (name, status)
select 'Nexis Laboratory', 'active'
where not exists (select 1 from companies where name = 'Nexis Laboratory');

-- =========================================================================
-- company_users: link admin to both companies as admin
-- =========================================================================
insert into company_users (company_id, user_id, role, status)
select c.id, u.id, 'admin', 'active'
from companies c
cross join users u
where c.name in ('Pasta House', 'Nexis Laboratory')
  and u.email = 'admin@example.com'
on conflict (company_id, user_id) do nothing;

-- =========================================================================
-- Projects
-- =========================================================================
insert into projects (company_id, name, description, type, status, url)
select c.id, 'Site Pasta House', 'Site vitrine Pasta House',
       'website', 'active', 'https://pastahouse.example.com'
from companies c
where c.name = 'Pasta House'
  and not exists (
    select 1 from projects p
    where p.company_id = c.id and p.name = 'Site Pasta House'
  );

insert into projects (company_id, name, description, type, status, url)
select c.id, 'Dashboard commandes', 'Tableau de bord interne des commandes',
       'dashboard', 'active', null
from companies c
where c.name = 'Pasta House'
  and not exists (
    select 1 from projects p
    where p.company_id = c.id and p.name = 'Dashboard commandes'
  );

insert into projects (company_id, name, description, type, status, url)
select c.id, 'Site Nexis Laboratory', 'Site institutionnel Nexis Laboratory',
       'website', 'active', 'https://nexis.example.com'
from companies c
where c.name = 'Nexis Laboratory'
  and not exists (
    select 1 from projects p
    where p.company_id = c.id and p.name = 'Site Nexis Laboratory'
  );

insert into projects (company_id, name, description, type, status, url)
select c.id, 'Portail client', 'Portail client sécurisé',
       'custom', 'active', null
from companies c
where c.name = 'Nexis Laboratory'
  and not exists (
    select 1 from projects p
    where p.company_id = c.id and p.name = 'Portail client'
  );

-- =========================================================================
-- Project metrics
-- =========================================================================
insert into project_metrics
  (company_id, project_id, metric_key, metric_label, metric_value,
   metric_unit, period_start, period_end)
select c.id, p.id, 'orders_today', 'Commandes aujourd''hui', 42,
       'count', date_trunc('day', now()),
       date_trunc('day', now()) + interval '1 day'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Pasta House'
where c.name = 'Pasta House';

insert into project_metrics
  (company_id, project_id, metric_key, metric_label, metric_value,
   metric_unit, period_start, period_end)
select c.id, p.id, 'revenue_today', 'Revenus', 128450,
       'cents', date_trunc('day', now()),
       date_trunc('day', now()) + interval '1 day'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Pasta House'
where c.name = 'Pasta House';

insert into project_metrics
  (company_id, project_id, metric_key, metric_label, metric_value,
   metric_unit, period_start, period_end)
select c.id, p.id, 'contact_requests', 'Demandes de contact', 7,
       'count', date_trunc('week', now()),
       date_trunc('week', now()) + interval '7 days'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Nexis Laboratory'
where c.name = 'Nexis Laboratory';

insert into project_metrics
  (company_id, project_id, metric_key, metric_label, metric_value,
   metric_unit, period_start, period_end)
select c.id, p.id, 'visitors', 'Visiteurs', 1284,
       'count', date_trunc('week', now()),
       date_trunc('week', now()) + interval '7 days'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Nexis Laboratory'
where c.name = 'Nexis Laboratory';

-- =========================================================================
-- Events
-- =========================================================================
insert into events (company_id, project_id, type, title, description,
                    severity, metadata)
select c.id, p.id, 'order_received', 'Commande reçue',
       'Nouvelle commande sur le site', 'success',
       '{"order_id": "demo-001"}'::jsonb
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Pasta House'
where c.name = 'Pasta House';

insert into events (company_id, project_id, type, title, description,
                    severity, metadata)
select c.id, p.id, 'maintenance_done', 'Maintenance effectuée',
       'Maintenance de routine terminée', 'info', '{}'::jsonb
from companies c
join projects p on p.company_id = c.id and p.name = 'Dashboard commandes'
where c.name = 'Pasta House';

insert into events (company_id, project_id, type, title, description,
                    severity, metadata)
select c.id, p.id, 'contact_request', 'Demande de contact reçue',
       'Un visiteur a soumis une demande de contact', 'info',
       '{"source": "homepage"}'::jsonb
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Nexis Laboratory'
where c.name = 'Nexis Laboratory';

-- =========================================================================
-- Notifications
-- =========================================================================
insert into notifications (company_id, user_id, title, body, type)
select c.id, u.id, 'Bienvenue sur RR Digital',
       'Votre espace Pasta House est prêt.', 'info'
from companies c
cross join users u
where c.name = 'Pasta House' and u.email = 'admin@example.com';

insert into notifications (company_id, user_id, title, body, type)
select c.id, u.id, 'Bienvenue sur RR Digital',
       'Votre espace Nexis Laboratory est prêt.', 'info'
from companies c
cross join users u
where c.name = 'Nexis Laboratory' and u.email = 'admin@example.com';

-- =========================================================================
-- Support requests
-- =========================================================================
insert into support_requests
  (company_id, project_id, created_by_user_id, title, message,
   type, priority, status)
select c.id, p.id, u.id,
       'Modification du logo',
       'Pourriez-vous remplacer le logo sur la page d''accueil ?',
       'modification', 'normal', 'open'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Pasta House'
cross join users u
where c.name = 'Pasta House' and u.email = 'admin@example.com';

insert into support_requests
  (company_id, project_id, created_by_user_id, title, message,
   type, priority, status)
select c.id, p.id, u.id,
       'Problème de chargement',
       'La page contact charge un peu lentement sur mobile.',
       'technical', 'high', 'in_progress'
from companies c
join projects p on p.company_id = c.id and p.name = 'Site Nexis Laboratory'
cross join users u
where c.name = 'Nexis Laboratory' and u.email = 'admin@example.com';
