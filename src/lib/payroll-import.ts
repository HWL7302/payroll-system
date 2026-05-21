import { inflateRawSync } from "node:zlib";

export const payrollImportHeaders = [
  "社員番号",
  "対象年月",
  "基本給",
  "残業代",
  "各種手当",
  "交通費",
  "健康保険",
  "厚生年金",
  "雇用保険",
  "所得税",
  "住民税",
  "その他控除",
  "控除合計",
  "差引支給額",
] as const;

export type PayrollImportInputRow = {
  rowNumber: number;
  employeeCode: string;
  payrollMonth: string;
  baseSalary: number;
  overtimePay: number;
  allowances: number;
  transportationExpense: number;
  healthInsurance: number;
  pensionInsurance: number;
  employmentInsurance: number;
  incomeTax: number;
  residentTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
};

export type PayrollImportParsedRow = PayrollImportInputRow & {
  employeeId?: string;
  employeeName?: string;
  status: "ready" | "duplicate" | "error" | "saved";
  errors: string[];
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

type CellValue = string | number | null;

export function parsePayrollImportWorkbook(buffer: Buffer): PayrollImportParsedRow[] {
  const entries = readZipEntries(buffer);
  const sharedStrings = readSharedStrings(entries);
  const sheetEntry = entries.get("xl/worksheets/sheet1.xml");

  if (!sheetEntry) {
    throw new Error("先頭シートを読み込めませんでした。");
  }

  const sheetRows = readSheetRows(sheetEntry.data.toString("utf8"), sharedStrings);
  const headerRow = sheetRows[0] ?? [];
  const headerErrors = validateHeaders(headerRow);

  if (headerErrors.length > 0) {
    throw new Error(headerErrors.join(" "));
  }

  return sheetRows
    .slice(1)
    .map((row, index) => parsePayrollRow(row, index + 2))
    .filter((row) => !isBlankImportRow(row));
}

function readZipEntries(buffer: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>();
  let offset = buffer.length - 22;

  while (offset >= 0 && buffer.readUInt32LE(offset) !== 0x06054b50) {
    offset -= 1;
  }

  if (offset < 0) {
    throw new Error("xlsx ファイルを読み込めませんでした。");
  }

  const totalEntries = buffer.readUInt16LE(offset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(offset + 16);
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("xlsx ファイルの構造を読み込めませんでした。");
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : inflateRawSync(compressed);

    entries.set(name, {
      name,
      data,
    });

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readSharedStrings(entries: Map<string, ZipEntry>): string[] {
  const entry = entries.get("xl/sharedStrings.xml");

  if (!entry) {
    return [];
  }

  const xml = entry.data.toString("utf8");

  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join(""),
    ),
  );
}

function readSheetRows(xml: string, sharedStrings: string[]): CellValue[][] {
  return [...xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(
    (rowMatch) => {
      const values: CellValue[] = [];

      for (const cellMatch of rowMatch[2].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attributes = cellMatch[1];
        const body = cellMatch[2];
        const reference = attributes.match(/\sr="([A-Z]+)\d+"/)?.[1] ?? "A";
        const type = attributes.match(/\st="([^"]+)"/)?.[1];
        const columnIndex = columnNameToIndex(reference);

        values[columnIndex] = readCellValue(body, type, sharedStrings);
      }

      return values;
    },
  );
}

function readCellValue(
  body: string,
  type: string | undefined,
  sharedStrings: string[],
): CellValue {
  if (type === "inlineStr") {
    const inlineText = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
    return inlineText ? decodeXml(inlineText) : "";
  }

  const rawValue = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1];

  if (rawValue === undefined) {
    return null;
  }

  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  if (type === "str") {
    return decodeXml(rawValue);
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : decodeXml(rawValue);
}

function validateHeaders(headerRow: CellValue[]): string[] {
  const headers = payrollImportHeaders.map((header, index) => {
    return normalizeText(headerRow[index]);
  });

  const missing = payrollImportHeaders.filter((header, index) => headers[index] !== header);

  return missing.length > 0
    ? [`テンプレートの列が一致しません。不足または順序違い: ${missing.join(", ")}`]
    : [];
}

function parsePayrollRow(row: CellValue[], rowNumber: number): PayrollImportParsedRow {
  const errors: string[] = [];
  const employeeCode = normalizeText(row[0]);
  const payrollMonth = normalizePayrollMonth(row[1]);

  if (!employeeCode) {
    errors.push("社員番号が未入力です。");
  }

  if (!payrollMonth) {
    errors.push("対象年月は YYYY-MM または日付で入力してください。");
  }

  const values = {
    baseSalary: parseMoney(row[2], "基本給", errors),
    overtimePay: parseMoney(row[3], "残業代", errors),
    allowances: parseMoney(row[4], "各種手当", errors),
    transportationExpense: parseMoney(row[5], "交通費", errors),
    healthInsurance: parseMoney(row[6], "健康保険", errors),
    pensionInsurance: parseMoney(row[7], "厚生年金", errors),
    employmentInsurance: parseMoney(row[8], "雇用保険", errors),
    incomeTax: parseMoney(row[9], "所得税", errors),
    residentTax: parseMoney(row[10], "住民税", errors),
    otherDeductions: parseMoney(row[11], "その他控除", errors),
    totalDeductions: parseMoney(row[12], "控除合計", errors),
    netPay: parseMoney(row[13], "差引支給額", errors),
  };

  return {
    rowNumber,
    employeeCode,
    payrollMonth: payrollMonth ?? "",
    ...values,
    status: errors.length > 0 ? "error" : "ready",
    errors,
  };
}

function parseMoney(value: CellValue, label: string, errors: string[]): number {
  if (value === null || value === "") {
    return 0;
  }

  const normalized =
    typeof value === "number"
      ? value
      : Number(String(value).replaceAll(",", "").trim());

  if (!Number.isFinite(normalized)) {
    errors.push(`${label}が数値ではありません。`);
    return 0;
  }

  return normalized;
}

function normalizePayrollMonth(value: CellValue): string | null {
  if (typeof value === "number") {
    const date = excelSerialDateToUtc(value);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const normalized = text.replaceAll("/", "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2].padStart(2, "0")}-01`;
}

function excelSerialDateToUtc(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 24 * 60 * 60 * 1000);
}

function isBlankImportRow(row: PayrollImportParsedRow): boolean {
  return (
    !row.employeeCode &&
    !row.payrollMonth &&
    row.baseSalary === 0 &&
    row.overtimePay === 0 &&
    row.allowances === 0 &&
    row.transportationExpense === 0 &&
    row.healthInsurance === 0 &&
    row.pensionInsurance === 0 &&
    row.employmentInsurance === 0 &&
    row.incomeTax === 0 &&
    row.residentTax === 0 &&
    row.otherDeductions === 0 &&
    row.totalDeductions === 0 &&
    row.netPay === 0
  );
}

function normalizeText(value: CellValue): string {
  return String(value ?? "").trim();
}

function columnNameToIndex(columnName: string): number {
  return [...columnName].reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}
