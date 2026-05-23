export type EmployeeStatus = "active" | "inactive" | "resigned";
export type EmployeeRole = "employee" | "admin";

export type Employee = {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  hire_date: string | null;
  resignation_date: string | null;
  status: EmployeeStatus;
  role: EmployeeRole;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PayrollRecord = {
  id: string;
  employee_id: string;
  payroll_month: string;
  attendance_days: number | null;
  holiday_attendance_days: number | null;
  paid_leave_days: number | null;
  absence_days: number | null;
  late_early_count: number | null;
  scheduled_work_hours: number | null;
  overtime_work_hours: number | null;
  holiday_work_hours: number | null;
  late_night_hours: number | null;
  late_early_hours: number | null;
  base_salary: number | null;
  overtime_pay: number | null;
  allowances: number | null;
  holiday_pay: number | null;
  late_night_pay: number | null;
  taxable_transportation_allowance: number | null;
  non_taxable_transportation_allowance: number | null;
  payment_total: number | null;
  transportation_expense: number | null;
  health_insurance: number | null;
  pension_insurance: number | null;
  employment_insurance: number | null;
  nursing_care_insurance: number | null;
  income_tax: number | null;
  resident_tax: number | null;
  child_care_support: number | null;
  other_deductions: number | null;
  total_deductions: number | null;
  social_insurance_total: number | null;
  taxable_amount: number | null;
  bank_transfer_amount: number | null;
  net_pay: number | null;
  created_at: string;
  updated_at: string;
};

export type TaxDocument = {
  id: string;
  employee_id: string;
  year: number;
  file_path: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
};
