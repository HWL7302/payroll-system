"use server";

import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import {
  parsePayrollImportWorkbook,
  type PayrollImportParsedRow,
} from "@/lib/payroll-import";
import { createClient } from "@/lib/supabase/server";

export type PayrollImportState = {
  error?: string;
  totalRows: number;
  savedRows: number;
  duplicateRows: number;
  errorRows: number;
  rows: PayrollImportParsedRow[];
};

const initialState: PayrollImportState = {
  totalRows: 0,
  savedRows: 0,
  duplicateRows: 0,
  errorRows: 0,
  rows: [],
};

export async function importPayrollWorkbook(
  _state: PayrollImportState,
  formData: FormData,
): Promise<PayrollImportState> {
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

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      ...initialState,
      error: ".xlsx ファイルを選択してください。",
    };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ...initialState,
      error: ".xlsx ファイルのみアップロードできます。",
    };
  }

  let rows: PayrollImportParsedRow[];

  try {
    rows = parsePayrollImportWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Excelファイルを読み込めませんでした。",
    };
  }

  if (rows.length === 0) {
    return {
      ...initialState,
      error: "読込対象の行がありません。",
    };
  }

  const employeeCodes = [...new Set(rows.map((row) => row.employeeCode).filter(Boolean))];
  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_code, name")
    .in("employee_code", employeeCodes);

  if (employeeError) {
    return {
      ...initialState,
      rows,
      totalRows: rows.length,
      error: "従業員マスタを取得できませんでした。Supabase の setup SQL を確認してください。",
    };
  }

  const employeeMap = new Map(
    (employees ?? []).map((employee) => [
      employee.employee_code,
      {
        id: employee.id as string,
        name: employee.name as string,
      },
    ]),
  );

  rows = rows.map((row) => {
    if (row.status === "error") {
      return row;
    }

    const employee = employeeMap.get(row.employeeCode);

    if (!employee) {
      return {
        ...row,
        status: "error",
        errors: ["社員番号に一致する従業員が見つかりません。"],
      };
    }

    return {
      ...row,
      employeeId: employee.id,
      employeeName: employee.name,
    };
  });

  const validRows = rows.filter((row) => row.status === "ready" && row.employeeId);
  const existingKeys = await findExistingPayrollKeys(validRows);

  rows = rows.map((row) => {
    if (row.status !== "ready" || !row.employeeId) {
      return row;
    }

    const key = toPayrollKey(row.employeeId, row.payrollMonth);

    return existingKeys.has(key)
      ? {
          ...row,
          status: "duplicate",
          errors: ["既存データあり"],
        }
      : row;
  });

  const insertRows = rows
    .filter((row) => row.status === "ready" && row.employeeId)
    .map((row) => ({
      employee_id: row.employeeId!,
      payroll_month: row.payrollMonth,
      base_salary: row.baseSalary,
      overtime_pay: row.overtimePay,
      allowances: row.allowances,
      transportation_expense: row.transportationExpense,
      health_insurance: row.healthInsurance,
      pension_insurance: row.pensionInsurance,
      employment_insurance: row.employmentInsurance,
      income_tax: row.incomeTax,
      resident_tax: row.residentTax,
      other_deductions: row.otherDeductions,
      total_deductions: row.totalDeductions,
      deductions: row.totalDeductions,
      net_pay: row.netPay,
    }));

  if (insertRows.length > 0) {
    const { error: insertError } = await supabase.from("payroll_records").insert(insertRows);

    if (insertError) {
      return {
        totalRows: rows.length,
        savedRows: 0,
        duplicateRows: rows.filter((row) => row.status === "duplicate").length,
        errorRows: rows.filter((row) => row.status === "error").length,
        rows,
        error: "給与データを保存できませんでした。setup SQL が最新か確認してください。",
      };
    }

    rows = rows.map((row) =>
      row.status === "ready"
        ? {
            ...row,
            status: "saved",
          }
        : row,
    );
  }

  return {
    totalRows: rows.length,
    savedRows: rows.filter((row) => row.status === "saved").length,
    duplicateRows: rows.filter((row) => row.status === "duplicate").length,
    errorRows: rows.filter((row) => row.status === "error").length,
    rows,
  };

  async function findExistingPayrollKeys(
    checkRows: PayrollImportParsedRow[],
  ): Promise<Set<string>> {
    const keys = new Set<string>();

    for (const row of checkRows) {
      const { data } = await supabase
        .from("payroll_records")
        .select("employee_id, payroll_month")
        .eq("employee_id", row.employeeId!)
        .eq("payroll_month", row.payrollMonth)
        .maybeSingle();

      if (data) {
        keys.add(toPayrollKey(data.employee_id as string, data.payroll_month as string));
      }
    }

    return keys;
  }
}

function toPayrollKey(employeeId: string, payrollMonth: string): string {
  return `${employeeId}:${payrollMonth}`;
}
