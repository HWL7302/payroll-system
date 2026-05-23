"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TaxDocumentUploadState = {
  error?: string;
  success?: string;
};

const TAX_DOCUMENT_BUCKET = "tax-documents";

export async function uploadTaxDocument(
  _state: TaxDocumentUploadState,
  formData: FormData,
): Promise<TaxDocumentUploadState> {
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

  const employeeId = String(formData.get("employee_id") ?? "");
  const yearValue = String(formData.get("year") ?? "");
  const file = formData.get("file");
  const year = Number(yearValue);

  if (!employeeId) {
    return { error: "従業員を選択してください。" };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "年度を正しく入力してください。" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "PDFファイルを選択してください。" };
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "PDFファイルのみアップロードできます。" };
  }

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_code, name")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    return { error: "選択した従業員を確認できませんでした。" };
  }

  const filePath = `${employeeId}/${year}/withholding-slip.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TAX_DOCUMENT_BUCKET)
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return {
      error:
        "PDFをアップロードできませんでした。Supabase Storage の bucket と policy を確認してください。",
    };
  }

  const { error: upsertError } = await supabase.from("tax_documents").upsert(
    {
      employee_id: employeeId,
      year,
      file_path: filePath,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,year" },
  );

  if (upsertError) {
    return {
      error:
        "アップロード情報を保存できませんでした。Supabase の setup SQL が最新か確認してください。",
    };
  }

  revalidatePath("/admin/tax-documents");
  revalidatePath("/employee/tax-documents");

  return {
    success: `${employee.employee_code} ${employee.name} / ${year}年 の源泉徴収票PDFを保存しました。`,
  };
}
