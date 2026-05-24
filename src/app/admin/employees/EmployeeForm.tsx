"use client";

import { useActionState } from "react";
import { createEmployee, type EmployeeFormState } from "./actions";

const initialState: EmployeeFormState = {};

export function EmployeeForm() {
  const [state, formAction, isPending] = useActionState(
    createEmployee,
    initialState,
  );

  return (
    <form className="form employee-form" action={formAction}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="employee_code">社員番号</label>
          <input id="employee_code" name="employee_code" required />
        </div>
        <div className="field">
          <label htmlFor="name">氏名</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="hire_date">入社日</label>
          <input id="hire_date" name="hire_date" type="date" />
        </div>
        <div className="field">
          <label htmlFor="resignation_date">退職日</label>
          <input id="resignation_date" name="resignation_date" type="date" />
        </div>
        <div className="field">
          <label htmlFor="status">ステータス</label>
          <select id="status" name="status" defaultValue="active">
            <option value="active">在籍</option>
            <option value="resigned">退職</option>
            <option value="inactive">無効</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="role">権限</label>
          <select id="role" name="role" defaultValue="employee">
            <option value="employee">従業員</option>
            <option value="admin">管理者</option>
          </select>
        </div>
      </div>
      {state.error ? <div className="error">{state.error}</div> : null}
      {state.success ? <div className="success">{state.success}</div> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "登録中..." : "従業員を登録"}
      </button>
    </form>
  );
}
