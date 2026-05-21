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
