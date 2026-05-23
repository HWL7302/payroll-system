"use client";

import { useActionState } from "react";
import { uploadTaxDocument, type TaxDocumentUploadState } from "./actions";

type EmployeeOption = {
  id: string;
  employee_code: string;
  name: string;
};

type TaxDocumentUploadFormProps = {
  employees: EmployeeOption[];
};

const initialState: TaxDocumentUploadState = {};
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index);

export function TaxDocumentUploadForm({ employees }: TaxDocumentUploadFormProps) {
  const [state, formAction, isPending] = useActionState(
    uploadTaxDocument,
    initialState,
  );

  return (
    <form className="form" action={formAction}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="employee_id">従業員</label>
          <select id="employee_id" name="employee_id" required defaultValue="">
            <option value="" disabled>
              選択してください
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_code} / {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="year">年度</label>
          <select id="year" name="year" required defaultValue={currentYear}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="file">源泉徴収票PDF</label>
          <input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
        </div>
      </div>
      {state.error ? <div className="error">{state.error}</div> : null}
      {state.success ? <div className="success">{state.success}</div> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "アップロード中..." : "アップロード"}
      </button>
    </form>
  );
}
