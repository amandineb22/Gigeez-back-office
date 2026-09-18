import { cn } from "@/lib/utils";

/**
 * Explains where the revenue on this page comes from, while the piece-level
 * sales are still incomplete.
 *
 * The stock sheet recorded which pieces had sold but never when, so those
 * sales carry no date and fall out of every date-range figure. The profit and
 * loss sheet, by contrast, states each month's revenue in full. So for every
 * month the sheet covers, the tables above take both revenue and costs from
 * it and leave the piece-level rows out, rather than showing dated costs
 * against revenue that is missing most of the sales.
 *
 * Shown only while that gap actually exists: date the sales, or clear the
 * undated ones, and this disappears on its own.
 */
export function UndatedSalesNotice({
  undatedSalesCount,
  spreadsheetMonths = 0,
  className,
}: {
  undatedSalesCount: number;
  spreadsheetMonths?: number;
  className?: string;
}) {
  if (undatedSalesCount <= 0) return null;

  const usingSpreadsheet = spreadsheetMonths > 0;

  return (
    <div
      role="note"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-sm text-amber-900",
        className
      )}
    >
      <p className="font-medium">
        {usingSpreadsheet
          ? "These figures come from your profit and loss sheet, not from individual sales."
          : "Profit here reads worse than the business really is."}
      </p>
      <p className="mt-1.5 text-amber-900/80">
        {undatedSalesCount.toLocaleString()} of your sales came from the stock spreadsheet, which recorded that a
        piece had sold but never when. Those sales have no date, so they cannot be counted into any month.
      </p>
      {usingSpreadsheet ? (
        <p className="mt-1.5 text-amber-900/80">
          So for the {spreadsheetMonths === 1 ? "month" : `${spreadsheetMonths} months`} your profit and loss sheet
          covers, the profit and loss and cash flow tables take both revenue and costs from that sheet, which records
          every sale. The individual sales are left out of those months rather than added, so nothing is counted
          twice. Profit per product, further down, is still built from individual sales and so covers only part of
          the business.
        </p>
      ) : (
        <p className="mt-1.5 text-amber-900/80">
          So any figure built from individual sales counts only the ones that do carry a date, while the costs
          imported from your profit and loss sheet are all dated to the month. The two are not on the same footing,
          and profit comes out worse than the business really is. The financials section on the dashboard takes both
          sides from the profit and loss sheet and does not have this problem.
        </p>
      )}
    </div>
  );
}
