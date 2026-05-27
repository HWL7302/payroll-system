"use client";

import { useActionState, useEffect } from "react";
import {
  downloadTaxDocument,
  type TaxDocumentDownloadState,
} from "./actions";

type TaxDocumentDownloadButtonProps = {
  documentId: string | null;
  disabled?: boolean;
};

const initialState: TaxDocumentDownloadState = {};

export function TaxDocumentDownloadButton({
  documentId,
  disabled = false,
}: TaxDocumentDownloadButtonProps) {
  const [state, formAction, isPending] = useActionState(
    downloadTaxDocument,
    initialState,
  );

  useEffect(() => {
    if (state.downloadUrl) {
      window.location.href = state.downloadUrl;
    }
  }, [state.downloadUrl]);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="document_id" value={documentId ?? ""} />
      <button
        className="button"
        type="submit"
        disabled={disabled || !documentId || isPending}
      >
        {isPending ? "準備中..." : "源泉徴収票ダウンロード"}
      </button>
      {state.error ? <div className="error">{state.error}</div> : null}
    </form>
  );
}
