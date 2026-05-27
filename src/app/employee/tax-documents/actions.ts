"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Employee, TaxDocument } from "@/lib/types";

export type TaxDocumentDownloadState = {
  error?: string;
  downloadUrl?: string;
};

const TAX_DOCUMENT_BUCKET = "tax-documents";

export async function downloadTaxDocument(
  _state: TaxDocumentDownloadState,
  formData: FormData,
): Promise<TaxDocumentDownloadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");

  if (!documentId) {
    return { error: "ダウンロードする源泉徴収票を確認できませんでした。" };
  }

  const authEmail = user.email?.toLowerCase() ?? "";
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .ilike("email", authEmail)
    .maybeSingle<Employee>();

  if (employeeError || !employee) {
    return { error: "従業員情報を確認できませんでした。" };
  }

  const { data: document, error: documentError } = await supabase
    .from("tax_documents")
    .select(
      "id, employee_id, tax_year, file_path, uploaded_at, downloaded_at, created_at, updated_at",
    )
    .eq("id", documentId)
    .eq("employee_id", employee.id)
    .maybeSingle<TaxDocument>();

  if (documentError || !document?.file_path) {
    return { error: "ダウンロードできる源泉徴収票PDFが見つかりませんでした。" };
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(TAX_DOCUMENT_BUCKET)
    .createSignedUrl(document.file_path, 300, {
      download: `源泉徴収票_${document.tax_year}.pdf`,
    });

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return { error: "源泉徴収票PDFのダウンロードURLを作成できませんでした。" };
  }

  const { error: downloadError } = await supabase.rpc(
    "mark_tax_document_downloaded",
    {
      document_id: document.id,
    },
  );

  if (downloadError) {
    return {
      error:
        "ダウンロード履歴を保存できませんでした。Supabase の setup SQL が最新か確認してください。",
    };
  }

  revalidatePath("/employee/tax-documents");

  return { downloadUrl: signedUrlData.signedUrl };
}
