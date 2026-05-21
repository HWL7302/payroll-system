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
  base_salary: number;
  overtime_pay: number;
  allowances: number;
  transportation_expense: number;
  health_insurance: number;
  pension_insurance: number;
  employment_insurance: number;
  income_tax: number;
  resident_tax: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  created_at: string;
  updated_at: string;
};
