"use client";

import { useActionState } from "react";
import type { Employee } from "@/lib/types";
import { updateEmployee, type EmployeeFormState } from "./actions";

const initialState: EmployeeFormState = {};

type EmployeeManagementTableProps = {
  employees: Employee[];
};

export function EmployeeManagementTable({
  employees,
}: EmployeeManagementTableProps) {
  return (
    <div className="table-wrap">
      <table className="employee-management-table">
        <thead>
          <tr>
            <th>社員番号</th>
            <th>氏名</th>
            <th>メール</th>
            <th>入社日</th>
            <th>退職日</th>
            <th>ステータス</th>
            <th>権限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <EmployeeEditRow employee={employee} key={employee.id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeEditRow({ employee }: { employee: Employee }) {
  const [state, formAction, isPending] = useActionState(
    updateEmployee,
    initialState,
  );
  const formId = `employee-edit-${employee.id}`;
  const statusLabel = getStatusLabel(employee.resignation_date);
  const messageClassName = state.error
    ? "error inline-message"
    : "success inline-message";

  return (
    <tr>
      <td>
        <input
          form={formId}
          name="employee_code"
          defaultValue={employee.employee_code}
          required
        />
      </td>
      <td>
        <input form={formId} name="name" defaultValue={employee.name} required />
      </td>
      <td>
        <input
          form={formId}
          name="email"
          type="email"
          defaultValue={employee.email}
          required
        />
      </td>
      <td>
        <input
          form={formId}
          name="hire_date"
          type="date"
          defaultValue={employee.hire_date ?? ""}
        />
      </td>
      <td>
        <input
          form={formId}
          name="resignation_date"
          type="date"
          defaultValue={employee.resignation_date ?? ""}
        />
      </td>
      <td>
        <span className={`status-pill ${statusLabel === "退職" ? "danger" : ""}`}>
          {statusLabel}
        </span>
      </td>
      <td>
        <select form={formId} name="role" defaultValue={employee.role}>
          <option value="employee">従業員</option>
          <option value="admin">管理者</option>
        </select>
      </td>
      <td>
        <div className="employee-row-actions">
          <form action={formAction} id={formId}>
            <input name="id" type="hidden" value={employee.id} />
          </form>
          <button className="button compact" form={formId} type="submit" disabled={isPending}>
            {isPending ? "保存中" : "保存"}
          </button>
          {state.error || state.success ? (
            <div className={messageClassName}>{state.error ?? state.success}</div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function getStatusLabel(resignationDate: string | null): "在籍" | "退職" {
  if (!resignationDate) {
    return "在籍";
  }

  return resignationDate <= getTodayDateString() ? "退職" : "在籍";
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
