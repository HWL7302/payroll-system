import { inflateRawSync } from "node:zlib";

export const payrollImportHeaders = [
  "社員番号",
  "対象年月",
  "出勤日数",
  "休日出勤日数",
  "有給日数",
  "欠勤日数",
  "遅刻・早退回数",
  "所定労働時間",
  "時間外労働時間",
  "休日労働時間",
  "深夜時間",
  "遅刻・早退時間",
  "基本給",
  "普通残業手当",
  "休日手当",
  "深夜手当",
  "課税通勤手当",
  "非課税通勤手当",
  "支給額合計",
  "健康保険",
  "厚生年金",
  "雇用保険",
  "介護保険",
  "その他控除",
  "所得税",
  "住民税",
  "子ども・子育て支援金",
  "控除額合計",
  "社会保険合計",
  "課税対象額",
  "差引支給額",
  "振込支給額",
] as const;

export type PayrollImportInputRow = {
  rowNumber: number;
  employeeCode: string;
  payrollMonth: string;
  attendanceDays: number;
  holidayAttendanceDays: number;
  paidLeaveDays: number;
  absenceDays: number;
  lateEarlyCount: number;
  scheduledWorkHours: number;
  overtimeWorkHours: number;
  holidayWorkHours: number;
  lateNightHours: number;
  lateEarlyHours: number;
  baseSalary: number;
  overtimePay: number;
  holidayPay: number;
  lateNightPay: number;
  taxableTransportationAllowance: number;
  nonTaxableTransportationAllowance: number;
  paymentTotal: number;
  healthInsurance: number;
  pensionInsurance: number;
  employmentInsurance: number;
  nursingCareInsurance: number;
  otherDeductions: number;
  incomeTax: number;
  residentTax: number;
  childCareSupport: number;
  totalDeductions: number;
  socialInsuranceTotal: number;
  taxableAmount: number;
  netPay: number;
  bankTransferAmount: number;
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

    entries.set(name, { name, data });

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
  const headers = payrollImportHeaders.map((header, index) => normalizeText(headerRow[index]));
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
    attendanceDays: parseNumber(row[2], "出勤日数", errors),
    holidayAttendanceDays: parseNumber(row[3], "休日出勤日数", errors),
    paidLeaveDays: parseNumber(row[4], "有給日数", errors),
    absenceDays: parseNumber(row[5], "欠勤日数", errors),
    lateEarlyCount: parseNumber(row[6], "遅刻・早退回数", errors),
    scheduledWorkHours: parseNumber(row[7], "所定労働時間", errors),
    overtimeWorkHours: parseNumber(row[8], "時間外労働時間", errors),
    holidayWorkHours: parseNumber(row[9], "休日労働時間", errors),
    lateNightHours: parseNumber(row[10], "深夜時間", errors),
    lateEarlyHours: parseNumber(row[11], "遅刻・早退時間", errors),
    baseSalary: parseNumber(row[12], "基本給", errors),
    overtimePay: parseNumber(row[13], "普通残業手当", errors),
    holidayPay: parseNumber(row[14], "休日手当", errors),
    lateNightPay: parseNumber(row[15], "深夜手当", errors),
    taxableTransportationAllowance: parseNumber(row[16], "課税通勤手当", errors),
    nonTaxableTransportationAllowance: parseNumber(row[17], "非課税通勤手当", errors),
    paymentTotal: parseNumber(row[18], "支給額合計", errors),
    healthInsurance: parseNumber(row[19], "健康保険", errors),
    pensionInsurance: parseNumber(row[20], "厚生年金", errors),
    employmentInsurance: parseNumber(row[21], "雇用保険", errors),
    nursingCareInsurance: parseNumber(row[22], "介護保険", errors),
    otherDeductions: parseNumber(row[23], "その他控除", errors),
    incomeTax: parseNumber(row[24], "所得税", errors),
    residentTax: parseNumber(row[25], "住民税", errors),
    childCareSupport: parseNumber(row[26], "子ども・子育て支援金", errors),
    totalDeductions: parseNumber(row[27], "控除額合計", errors),
    socialInsuranceTotal: parseNumber(row[28], "社会保険合計", errors),
    taxableAmount: parseNumber(row[29], "課税対象額", errors),
    netPay: parseNumber(row[30], "差引支給額", errors),
    bankTransferAmount: parseNumber(row[31], "振込支給額", errors),
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

function parseNumber(value: CellValue, label: string, errors: string[]): number {
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
  const values = [
    row.attendanceDays,
    row.holidayAttendanceDays,
    row.paidLeaveDays,
    row.absenceDays,
    row.lateEarlyCount,
    row.scheduledWorkHours,
    row.overtimeWorkHours,
    row.holidayWorkHours,
    row.lateNightHours,
    row.lateEarlyHours,
    row.baseSalary,
    row.overtimePay,
    row.holidayPay,
    row.lateNightPay,
    row.taxableTransportationAllowance,
    row.nonTaxableTransportationAllowance,
    row.paymentTotal,
    row.healthInsurance,
    row.pensionInsurance,
    row.employmentInsurance,
    row.nursingCareInsurance,
    row.otherDeductions,
    row.incomeTax,
    row.residentTax,
    row.childCareSupport,
    row.totalDeductions,
    row.socialInsuranceTotal,
    row.taxableAmount,
    row.netPay,
    row.bankTransferAmount,
  ];

  return !row.employeeCode && !row.payrollMonth && values.every((value) => value === 0);
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
