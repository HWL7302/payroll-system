"use client";

import { deletePayrollRecord } from "./actions";

type PayrollRecordDeleteButtonProps = {
  id: string;
};

export function PayrollRecordDeleteButton({ id }: PayrollRecordDeleteButtonProps) {
  return (
    <form action={deletePayrollRecord}>
      <input name="id" type="hidden" value={id} />
      <button
        className="button secondary compact danger-action"
        type="submit"
        onClick={(event) => {
          if (
            !window.confirm(
              "この給与データを削除します。削除後は同じ月のデータを再アップロードできます。よろしいですか？",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        削除
      </button>
    </form>
  );
}
