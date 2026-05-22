"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PayrollMonthOption = {
  value: string;
  label: string;
};

type PayrollMonthSelectorProps = {
  options: PayrollMonthOption[];
  selectedMonth: string;
};

export function PayrollMonthSelector({
  options,
  selectedMonth,
}: PayrollMonthSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="statement-filter" aria-label="対象年月選択">
      <div>
        <p className="eyebrow">対象年月</p>
        <h2>表示する給与明細を選択</h2>
      </div>
      <label className="statement-month-field">
        <span>対象年月</span>
        <select
          aria-label="対象年月"
          value={selectedMonth}
          onChange={(event) => handleChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
