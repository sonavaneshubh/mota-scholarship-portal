const TYPE_STYLES: Record<string, string> = {
  Scholarship: 'border-sky-200 bg-sky-50 text-sky-700',
  'Maintenance Allowance': 'border-amber-200 bg-amber-50 text-amber-700',
  'Merit Scheme': 'border-violet-200 bg-violet-50 text-violet-700',
  'Fee Reimbursement': 'border-teal-200 bg-teal-50 text-teal-700',
};

export function SchemeTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-[16px] ${
        TYPE_STYLES[type] ?? 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {type}
    </span>
  );
}
