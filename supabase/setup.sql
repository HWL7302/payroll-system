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
  attendance_days numeric(8, 2),
  holiday_attendance_days numeric(8, 2),
  paid_leave_days numeric(8, 2),
  absence_days numeric(8, 2),
  late_early_count numeric(8, 2),
  scheduled_work_hours numeric(8, 2),
  overtime_work_hours numeric(8, 2),
  holiday_work_hours numeric(8, 2),
  late_night_hours numeric(8, 2),
  late_early_hours numeric(8, 2),
  base_salary numeric(12, 2),
  overtime_pay numeric(12, 2),
  allowances numeric(12, 2),
  holiday_pay numeric(12, 2),
  late_night_pay numeric(12, 2),
  taxable_transportation_allowance numeric(12, 2),
  non_taxable_transportation_allowance numeric(12, 2),
  payment_total numeric(12, 2),
  transportation_expense numeric(12, 2),
  health_insurance numeric(12, 2),
  pension_insurance numeric(12, 2),
  employment_insurance numeric(12, 2),
  nursing_care_insurance numeric(12, 2),
  income_tax numeric(12, 2),
  resident_tax numeric(12, 2),
  child_care_support numeric(12, 2),
  other_deductions numeric(12, 2),
  total_deductions numeric(12, 2),
  social_insurance_total numeric(12, 2),
  taxable_amount numeric(12, 2),
  bank_transfer_amount numeric(12, 2),
  deductions numeric(12, 2),
  net_pay numeric(12, 2),
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, payroll_month)
);

alter table public.payroll_records
  add column if not exists attendance_days numeric(8, 2),
  add column if not exists holiday_attendance_days numeric(8, 2),
  add column if not exists paid_leave_days numeric(8, 2),
  add column if not exists absence_days numeric(8, 2),
  add column if not exists late_early_count numeric(8, 2),
  add column if not exists scheduled_work_hours numeric(8, 2),
  add column if not exists overtime_work_hours numeric(8, 2),
  add column if not exists holiday_work_hours numeric(8, 2),
  add column if not exists late_night_hours numeric(8, 2),
  add column if not exists late_early_hours numeric(8, 2),
  add column if not exists holiday_pay numeric(12, 2),
  add column if not exists late_night_pay numeric(12, 2),
  add column if not exists taxable_transportation_allowance numeric(12, 2),
  add column if not exists non_taxable_transportation_allowance numeric(12, 2),
  add column if not exists payment_total numeric(12, 2),
  add column if not exists transportation_expense numeric(12, 2),
  add column if not exists health_insurance numeric(12, 2),
  add column if not exists pension_insurance numeric(12, 2),
  add column if not exists employment_insurance numeric(12, 2),
  add column if not exists nursing_care_insurance numeric(12, 2),
  add column if not exists income_tax numeric(12, 2),
  add column if not exists resident_tax numeric(12, 2),
  add column if not exists child_care_support numeric(12, 2),
  add column if not exists other_deductions numeric(12, 2),
  add column if not exists total_deductions numeric(12, 2),
  add column if not exists social_insurance_total numeric(12, 2),
  add column if not exists taxable_amount numeric(12, 2),
  add column if not exists bank_transfer_amount numeric(12, 2);

alter table public.payroll_records
  alter column attendance_days drop not null,
  alter column holiday_attendance_days drop not null,
  alter column paid_leave_days drop not null,
  alter column absence_days drop not null,
  alter column late_early_count drop not null,
  alter column scheduled_work_hours drop not null,
  alter column overtime_work_hours drop not null,
  alter column holiday_work_hours drop not null,
  alter column late_night_hours drop not null,
  alter column late_early_hours drop not null,
  alter column base_salary drop not null,
  alter column overtime_pay drop not null,
  alter column allowances drop not null,
  alter column holiday_pay drop not null,
  alter column late_night_pay drop not null,
  alter column taxable_transportation_allowance drop not null,
  alter column non_taxable_transportation_allowance drop not null,
  alter column payment_total drop not null,
  alter column transportation_expense drop not null,
  alter column health_insurance drop not null,
  alter column pension_insurance drop not null,
  alter column employment_insurance drop not null,
  alter column nursing_care_insurance drop not null,
  alter column income_tax drop not null,
  alter column resident_tax drop not null,
  alter column child_care_support drop not null,
  alter column other_deductions drop not null,
  alter column total_deductions drop not null,
  alter column deductions drop not null,
  alter column social_insurance_total drop not null,
  alter column taxable_amount drop not null,
  alter column bank_transfer_amount drop not null,
  alter column net_pay drop not null;

create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  year integer not null,
  file_path text not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, year)
);

alter table public.tax_documents
  add column if not exists year integer,
  add column if not exists file_path text,
  add column if not exists uploaded_at timestamptz not null default now();

alter table public.tax_documents
  add column if not exists tax_year integer,
  add column if not exists document_type text not null default 'withholding_slip',
  add column if not exists pdf_storage_path text,
  add column if not exists issued_at date;

update public.tax_documents
set
  year = coalesce(year, tax_year),
  file_path = coalesce(file_path, pdf_storage_path),
  uploaded_at = coalesce(uploaded_at, updated_at, created_at, now())
where year is null
   or file_path is null
   or uploaded_at is null;

create unique index if not exists tax_documents_employee_year_key
on public.tax_documents (employee_id, year);

insert into storage.buckets (id, name, public)
values ('tax-documents', 'tax-documents', false)
on conflict (id) do update set public = false;

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

drop policy if exists "Admins can manage tax document files" on storage.objects;
create policy "Admins can manage tax document files"
on storage.objects
for all
to authenticated
using (bucket_id = 'tax-documents' and public.is_admin())
with check (bucket_id = 'tax-documents' and public.is_admin());

drop policy if exists "Employees can view own tax document files" on storage.objects;
create policy "Employees can view own tax document files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tax-documents'
  and exists (
    select 1
    from public.employees
    where employees.id::text = split_part(storage.objects.name, '/', 1)
      and (employees.auth_user_id = auth.uid() or lower(employees.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
);
