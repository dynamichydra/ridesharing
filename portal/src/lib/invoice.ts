import type { RideInvoice } from "@/features/ride-payments/types";
import { formatDateTime } from "@/lib/utils";

function money(amountMinor: number | null, currencyCode: string): string {
  if (amountMinor == null) return "—";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amountMinor / 100);
  } catch {
    return `${currencyCode} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function breakdownRows(breakdown: Record<string, unknown>, currencyCode: string): string {
  const labels: Record<string, string> = {
    baseFareMinor: "Base fare",
    distanceFareMinor: "Distance fare",
    timeFareMinor: "Time fare",
    taxMinor: "Tax",
  };
  const rows = Object.entries(breakdown)
    .filter(([key, value]) => key in labels && typeof value === "number")
    .map(([key, value]) => `<tr><td>${labels[key]}</td><td class="amt">${money(value as number, currencyCode)}</td></tr>`);
  return rows.join("");
}

// Builds a self-contained, printable HTML invoice and triggers a browser download.
// No PDF library in the project — this opens/prints cleanly and is a genuine downloadable
// document without adding a new dependency for a single admin-facing action.
export function downloadInvoice(invoice: RideInvoice) {
  const currency = invoice.currencyCode;
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${invoice.invoiceNumber}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #1a1a1a; max-width: 640px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .muted { color: #6b7280; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
  .box h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  td.amt { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: none; padding-top: 10px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; text-transform: capitalize; }
</style>
</head>
<body>
  <h1>Invoice ${invoice.invoiceNumber}</h1>
  <div class="muted">Ride completed ${formatDateTime(invoice.ride.completedAt)}</div>

  <div class="grid">
    <div class="box">
      <h2>Rider</h2>
      <div>${invoice.rider?.name ?? "—"}</div>
      <div class="muted">${invoice.rider?.phone ?? "—"}</div>
    </div>
    <div class="box">
      <h2>Driver</h2>
      <div>${invoice.driver?.name ?? "—"}</div>
      <div class="muted">${invoice.driver?.phone ?? "—"}</div>
    </div>
    <div class="box">
      <h2>Trip</h2>
      <div>${invoice.ride.pickupAddress ?? "—"}</div>
      <div class="muted">→ ${invoice.ride.dropAddress ?? "—"}</div>
      <div class="muted">${invoice.ride.distanceKm ?? "—"} km · ${invoice.ride.durationMin ?? "—"} min</div>
    </div>
    <div class="box">
      <h2>Payment</h2>
      <div class="badge">${invoice.payment.status}</div>
      <div class="muted" style="margin-top:6px;">
        ${invoice.payment.method ?? "—"} via ${invoice.payment.gateway ?? "—"}
      </div>
      <div class="muted">${invoice.payment.paidAt ? formatDateTime(invoice.payment.paidAt) : "Not yet paid"}</div>
    </div>
  </div>

  <table>
    ${breakdownRows(invoice.fareBreakdown, currency)}
    <tr class="total"><td>Total Fare</td><td class="amt">${money(invoice.finalFareMinor, currency)}</td></tr>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
