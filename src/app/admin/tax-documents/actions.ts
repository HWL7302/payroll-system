"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TaxDocumentUploadState = {
  error?: string;
  success?: string;
};

export type TaxDocumentDeleteState = {
  error?: string;
  success?: string;
};

const TAX_DOCUMENT_BUCKET = "tax-documents";

export async function uploadTaxDocument(
  _state: TaxDocumentUploadState,
  formData: FormData,
): Promise<TaxDocumentUploadState> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

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

  const { data: existingDocument, error: existingError } = await supabase
    .from("tax_documents")
    .select("id, file_path")
    .eq("employee_id", employeeId)
    .eq("tax_year", taxYear)
    .maybeSingle();

  if (existingError) {
    return {
      error: `既存の源泉徴収票情報を確認できませんでした。${formatSupabaseError(existingError)}`,
    };
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
  const { error: upsertError } = await supabase.from("tax_documents").upsert(
    {
      employee_id: employeeId,
      tax_year: taxYear,
      file_path: filePath,
      uploaded_at: uploadedAt,
    },
    { onConflict: "employee_id,tax_year" },
  );

  if (upsertError) {
    await supabase.storage.from(TAX_DOCUMENT_BUCKET).remove([filePath]);

    return {
      error: `アップロード情報を保存できませんでした。${formatSupabaseError(upsertError)}`,
    };
  }

  if (existingDocument?.file_path && existingDocument.file_path !== filePath) {
    await supabase.storage.from(TAX_DOCUMENT_BUCKET).remove([existingDocument.file_path]);
  }

  revalidatePath("/admin/tax-documents");
  revalidatePath("/employee/tax-documents");

  return {
    success: `${employee.employee_code} ${employee.name} / ${taxYear}年 の源泉徴収票PDFを保存しました。`,
  };
}

export async function deleteTaxDocument(
  _state: TaxDocumentDeleteState,
  formData: FormData,
): Promise<TaxDocumentDeleteState> {
  const supabase = await createClient();
  await ensureAdmin(supabase);

  const documentId = String(formData.get("document_id") ?? "");

  if (!documentId) {
    return { error: "削除する源泉徴収票を確認できませんでした。" };
  }

  const { data: document, error: documentError } = await supabase
    .from("tax_documents")
    .select("id, tax_year, file_path, employees(employee_code, name)")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    return { error: "削除する源泉徴収票を確認できませんでした。" };
  }

  if (document.file_path) {
    const { error: storageError } = await supabase.storage
      .from(TAX_DOCUMENT_BUCKET)
      .remove([document.file_path]);

    if (storageError) {
      return {
        error: `Storage上のPDFを削除できませんでした。${formatSupabaseError(storageError)}`,
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("tax_documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) {
    return {
      error: `源泉徴収票のDBレコードを削除できませんでした。${formatSupabaseError(deleteError)}`,
    };
  }

  revalidatePath("/admin/tax-documents");
  revalidatePath("/employee/tax-documents");

  const employee = getEmployee(document);

  return {
    success: `${employee?.employee_code ?? ""} ${employee?.name ?? ""} / ${
      document.tax_year
    }年 の源泉徴収票PDFを削除しました。`,
  };
}

async function ensureAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (getUserRole(user) !== "admin") {
    redirect("/employee");
  }
}

function getEmployee(document: {
  employees:
    | { employee_code: string; name: string }
    | { employee_code: string; name: string }[]
    | null;
}) {
  return Array.isArray(document.employees)
    ? (document.employees[0] ?? null)
    : document.employees;
}

function formatSupabaseError(error: { code?: string; message?: string }): string {
  const code = error.code ? `エラーコード: ${error.code}。` : "";
  const message = error.message ? `詳細: ${error.message}` : "";

  return `${code}${message}` || "Supabase の setup SQL と RLS policy を確認してください。";
}
