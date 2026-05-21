create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  name text not null,
  email text not null unique,
  hire_date date,
  resignation_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'resigned')),
  role text not null default 'employee' check (role in ('employee', 'admin')),
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_month date not null,
  base_salary numeric(12, 2) not null default 0,
  overtime_pay numeric(12, 2) not null default 0,
  allowances numeric(12, 2) not null default 0,
  deductions numeric(12, 2) not null default 0,
  net_pay numeric(12, 2) not null default 0,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, payroll_month)
);

create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  tax_year integer not null,
  document_type text not null default 'withholding_slip',
  pdf_storage_path text,
  issued_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, tax_year, document_type)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists set_payroll_records_updated_at on public.payroll_records;
create trigger set_payroll_records_updated_at
before update on public.payroll_records
for each row execute function public.set_updated_at();

drop trigger if exists set_tax_documents_updated_at on public.tax_documents;
create trigger set_tax_documents_updated_at
before update on public.tax_documents
for each row execute function public.set_updated_at();

alter table public.employees enable row level security;
alter table public.payroll_records enable row level security;
alter table public.tax_documents enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@test.com';
$$;

drop policy if exists "Admins can manage employees" on public.employees;
create policy "Admins can manage employees"
on public.employees
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Employees can view own employee record" on public.employees;
create policy "Employees can view own employee record"
on public.employees
for select
to authenticated
using (auth_user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Admins can manage payroll records" on public.payroll_records;
create policy "Admins can manage payroll records"
on public.payroll_records
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Employees can view own payroll records" on public.payroll_records;
create policy "Employees can view own payroll records"
on public.payroll_records
for select
to authenticated
using (
  exists (
    select 1
    from public.employees
    where employees.id = payroll_records.employee_id
      and (employees.auth_user_id = auth.uid() or lower(employees.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);

drop policy if exists "Admins can manage tax documents" on public.tax_documents;
create policy "Admins can manage tax documents"
on public.tax_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Employees can view own tax documents" on public.tax_documents;
create policy "Employees can view own tax documents"
on public.tax_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.employees
    where employees.id = tax_documents.employee_id
      and (employees.auth_user_id = auth.uid() or lower(employees.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);
