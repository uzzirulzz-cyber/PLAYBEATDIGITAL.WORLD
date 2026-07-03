// Currency & formatting helpers

export function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPrice(amount: number, currency = "PKR"): string {
  return `${currency} ${formatPKR(amount)}`;
}

export function discountPercent(price: number, oldPrice?: number): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function generateOrderRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PB-${ts}-${rand}`;
}

export function classNames(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
