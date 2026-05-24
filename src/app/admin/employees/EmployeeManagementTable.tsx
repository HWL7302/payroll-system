"use client";

import { useActionState } from "react";
import type { Employee } from "@/lib/types";
import {
  deactivateEmployee,
  updateEmployee,
  type EmployeeFormState,
} from "./actions";

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
  const [updateState, updateAction, isUpdating] = useActionState(
    updateEmployee,
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deactivateEmployee,
    initialState,
  );
  const formId = `employee-edit-${employee.id}`;
  const deleteFormId = `employee-delete-${employee.id}`;
  const message =
    updateState.error ??
    updateState.success ??
    deleteState.error ??
    deleteState.success;
  const messageClassName =
    updateState.error || deleteState.error
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
        <select form={formId} name="status" defaultValue={employee.status}>
          <option value="active">在籍</option>
          <option value="resigned">退職</option>
          <option value="inactive">無効</option>
        </select>
      </td>
      <td>
        <select form={formId} name="role" defaultValue={employee.role}>
          <option value="employee">従業員</option>
          <option value="admin">管理者</option>
        </select>
      </td>
      <td>
        <div className="employee-row-actions">
          <form action={updateAction} id={formId}>
            <input name="id" type="hidden" value={employee.id} />
          </form>
          <button className="button compact" form={formId} type="submit" disabled={isUpdating}>
            {isUpdating ? "保存中" : "保存"}
          </button>
          <form action={deleteAction} id={deleteFormId}>
            <input name="id" type="hidden" value={employee.id} />
          </form>
          <button
            className="button secondary compact danger-action"
            form={deleteFormId}
            type="submit"
            disabled={isDeleting}
            onClick={(event) => {
              if (
                !window.confirm(
                  "この従業員を無効にします。給与データは削除されません。よろしいですか？",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            {isDeleting ? "処理中" : "削除"}
          </button>
          {message ? <div className={messageClassName}>{message}</div> : null}
        </div>
      </td>
    </tr>
  );
}
