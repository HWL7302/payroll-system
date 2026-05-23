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
  const yearValue = String(formData.get("tax_year") ?? "");
  const file = formData.get("file");
  const taxYear = Number(yearValue);

  if (!employeeId) {
    return { error: "従業員を選択してください。" };
  }

  if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
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

  const filePath = `${employeeId}/${taxYear}/withholding-slip.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(TAX_DOCUMENT_BUCKET)
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return {
      error: `PDFをアップロードできませんでした。${formatSupabaseError(uploadError)}`,
    };
  }

  const uploadedAt = new Date().toISOString();
  const documentPayload = {
    employee_id: employeeId,
    tax_year: taxYear,
    file_path: filePath,
    uploaded_at: uploadedAt,
  };
  const { count: updatedCount, error: updateError } = await supabase
    .from("tax_documents")
    .update(documentPayload, { count: "exact" })
    .eq("employee_id", employeeId)
    .eq("tax_year", taxYear);

  if (updateError) {
    return {
      error: `アップロード情報を更新できませんでした。${formatSupabaseError(updateError)}`,
    };
  }

  if ((updatedCount ?? 0) === 0) {
    const { error: insertError } = await supabase
      .from("tax_documents")
      .insert(documentPayload);

    if (insertError) {
      return {
        error: `アップロード情報を保存できませんでした。${formatSupabaseError(insertError)}`,
      };
    }
  }

  revalidatePath("/admin/tax-documents");
  revalidatePath("/employee/tax-documents");

  return {
    success: `${employee.employee_code} ${employee.name} / ${taxYear}年 の源泉徴収票PDFを保存しました。`,
  };
}

function formatSupabaseError(error: { code?: string; message?: string }): string {
  const code = error.code ? `エラーコード: ${error.code}。` : "";
  const message = error.message ? `詳細: ${error.message}` : "";

  return `${code}${message}` || "Supabase の setup SQL と RLS policy を確認してください。";
}
