import { cn } from "@/lib/utils";

/**
 * Warns that revenue and expenses on this page are not on a level footing.
 *
 * The stock sheet recorded which pieces had sold but never when, so those
 * sales carry no date and fall out of every date-range figure. The expense
 * lines from the profit and loss sheet, by contrast, are dated to the month.
 * Put the two in the same P&L and profit looks far worse than it really is.
 *
 * Shown only while that mismatch actually exists: date the sales, or clear
 * the undated ones, and this disappears on its own.
 */
export function UndatedSalesNotice({
  undatedSalesCount,
  className,
}: {
  undatedSalesCount: number;
  className?: string;
}) {
  if (undatedSalesCount <= 0) return null;

  return (
    <div
      role="note"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-sm text-amber-900",
        className
      )}
    >
      <p className="font-medium">Profit here reads worse than the business really is.</p>
      <p className="mt-1.5 text-amber-900/80">
        {undatedSalesCount.toLocaleString()} of your sales came from the stock spreadsheet, which recorded that a
        piece had sold but never when. Those sales have no date, so they are missing from the revenue in any date
        range, while the expenses imported from the profit and loss sheet are dated to the month. The two are not
        being compared fairly.
      </p>
      <p className="mt-1.5 text-amber-900/80">
        For revenue and costs on the same footing, use the financials section on the dashboard, which takes both
        sides from the profit and loss sheet.
      </p>
    </div>
  );
}
