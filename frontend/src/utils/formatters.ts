/**
 * Formatting utilities for Indian Financial Services (FSI)
 */

export function formatINR(amount: number): string {
  if (Number.isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRLakh(amount: number): string {
  if (Number.isNaN(amount)) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return formatINR(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  if (Number.isNaN(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}

export function maskTaxId(pan: string): string {
  if (!pan || pan.length < 5) return "XXXXX1234F";
  return `${pan.slice(0, 3)}XX${pan.slice(5)}`;
}

export function maskAccount(acc: string): string {
  if (!acc || acc.length < 4) return "••••1234";
  return `••••••••${acc.slice(-4)}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "-";
  return `${formatDate(isoString)} ${formatTime(isoString)}`;
}
