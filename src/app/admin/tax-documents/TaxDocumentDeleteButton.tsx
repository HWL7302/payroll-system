"use client";

import { useActionState } from "react";
import { deleteTaxDocument, type TaxDocumentDeleteState } from "./actions";

type TaxDocumentDeleteButtonProps = {
  documentId: string;
  label: string;
};

const initialState: TaxDocumentDeleteState = {};

export function TaxDocumentDeleteButton({
  documentId,
  label,
}: TaxDocumentDeleteButtonProps) {
  const [state, formAction, isPending] = useActionState(
    deleteTaxDocument,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`${label} を削除します。よろしいですか？`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="document_id" value={documentId} />
      <button className="button secondary" type="submit" disabled={isPending}>
        {isPending ? "削除中..." : "削除"}
      </button>
      {state.error ? <div className="error">{state.error}</div> : null}
      {state.success ? <div className="success">{state.success}</div> : null}
    </form>
  );
}
