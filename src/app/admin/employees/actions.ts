"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EmployeeRole, EmployeeStatus } from "@/lib/types";

export type EmployeeFormState = {
  error?: string;
  success?: string;
};

const employeeRoles = new Set<EmployeeRole>(["employee", "admin"]);

export async function createEmployee(
  _state: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (getUserRole(user) !== "admin") {
    redirect("/employee");
  }

  const employee_code = String(formData.get("employee_code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hire_date = normalizeOptionalDate(formData.get("hire_date"));
  const role = normalizeRole(formData.get("role"));

  if (!employee_code || !name || !email) {
    return {
      error: "社員番号、氏名、メールアドレスを入力してください。",
    };
  }

  const { error } = await supabase.from("employees").insert({
    employee_code,
    name,
    email,
    hire_date,
    resignation_date: null,
    status: "active",
    role,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "同じ社員番号またはメールアドレスの従業員がすでに登録されています。",
      };
    }

    return {
      error: "従業員を登録できませんでした。Supabase のテーブルと権限設定を確認してください。",
    };
  }

  revalidatePath("/admin/employees");

  return {
    success: "従業員を登録しました。",
  };
}

export async function updateEmployee(
  _state: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const authResult = await requireAdmin();
  const { supabase } = authResult;
  const id = String(formData.get("id") ?? "").trim();
  const employee_code = String(formData.get("employee_code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hire_date = normalizeOptionalDate(formData.get("hire_date"));
  const resignation_date = normalizeOptionalDate(formData.get("resignation_date"));
  const status = getStatusFromResignationDate(resignation_date);
  const role = normalizeRole(formData.get("role"));

  if (!id || !employee_code || !name || !email) {
    return {
      error: "社員番号、氏名、メールアドレスを入力してください。",
    };
  }

  const { error } = await supabase
    .from("employees")
    .update({
      employee_code,
      name,
      email,
      hire_date,
      resignation_date,
      status,
      role,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "同じ社員番号またはメールアドレスの従業員がすでに登録されています。",
      };
    }

    return {
      error: "従業員情報を更新できませんでした。Supabase のテーブルと権限設定を確認してください。",
    };
  }

  revalidatePath("/admin/employees");
  revalidatePath("/employee");
  revalidatePath("/employee/tax-documents");

  return {
    success: "従業員情報を更新しました。",
  };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (getUserRole(user) !== "admin") {
    redirect("/employee");
  }

  return { supabase };
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function normalizeOptionalDate(value: FormDataEntryValue | null): string | null {
  const text = normalizeOptionalText(value);
  return text || null;
}

function getStatusFromResignationDate(resignationDate: string | null): EmployeeStatus {
  if (!resignationDate) {
    return "active";
  }

  return resignationDate <= getTodayDateString() ? "resigned" : "active";
}

function getTodayDateString(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeRole(value: FormDataEntryValue | null): EmployeeRole {
  const role = String(value ?? "employee");
  return employeeRoles.has(role as EmployeeRole)
    ? (role as EmployeeRole)
    : "employee";
}
