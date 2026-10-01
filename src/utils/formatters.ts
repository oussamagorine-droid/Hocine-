export function formatCurrency(amount: number, currency: string = 'د.ج'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `0 ${currency}`;
  const formatted = new Intl.NumberFormat('fr-DZ', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatWeight(weightInKg: number, unit: string = 'kg'): string {
  if (unit === 'kg') {
    if (weightInKg < 1 && weightInKg > 0) {
      return `${Math.round(weightInKg * 1000)} غرام`;
    }
    return `${Number(weightInKg.toFixed(3))} كغ`;
  }
  if (unit === 'g') {
    return `${weightInKg} غرام`;
  }
  if (unit === 'liter') {
    return `${weightInKg} لتر`;
  }
  if (unit === 'piece') {
    return `${weightInKg} قطعة`;
  }
  if (unit === 'pack') {
    return `${weightInKg} علبة/حزمة`;
  }
  if (unit === 'box') {
    return `${weightInKg} كرتون/صندوق`;
  }
  return `${weightInKg} ${unit}`;
}

export function calculateScalePrice(pricePerKg: number, weightInGramsOrKg: number, inputUnit: 'kg' | 'g' = 'kg'): {
  totalPrice: number;
  weightKg: number;
  weightGrams: number;
} {
  const weightKg = inputUnit === 'g' ? weightInGramsOrKg / 1000 : weightInGramsOrKg;
  const weightGrams = inputUnit === 'g' ? weightInGramsOrKg : Math.round(weightInGramsOrKg * 1000);
  const totalPrice = Math.round(pricePerKg * weightKg * 100) / 100;
  return { totalPrice, weightKg, weightGrams };
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

export function generateBarcode(): string {
  // Generate valid 13-digit EAN style barcode
  const prefix = '613'; // Algerian EAN prefix
  const random = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${random}`.slice(0, 13);
}

export function formatDateAr(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns YYYY-MM-DD in local time to avoid UTC offset discrepancies
 */
export function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalizes any date string (ISO timestamp, YYYY/MM/DD, DD/MM/YYYY, etc.) to standard YYYY-MM-DD
 */
export function normalizeDateStr(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return trimmed.slice(0, 10);
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

/**
 * Computes exact start and end dates (YYYY-MM-DD) for standard filters:
 * Today (اليوم), Week (الأسبوع), Month (الشهر), Year (السنة), All (الكل)
 */
export function getPeriodDateRange(period: PeriodFilter): { start: string; end: string; label: string } {
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  if (period === 'today') {
    return { start: todayStr, end: todayStr, label: 'اليوم' };
  }

  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { start: getLocalDateStr(d), end: todayStr, label: 'هذا الأسبوع' };
  }

  if (period === 'month') {
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: getLocalDateStr(firstDayMonth), end: todayStr, label: 'هذا الشهر' };
  }

  if (period === 'year') {
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    return { start: getLocalDateStr(firstDayYear), end: todayStr, label: 'هذه السنة' };
  }

  return { start: '1970-01-01', end: '2099-12-31', label: 'كافة الفترات' };
}

/**
 * Checks if a given date string falls within the specified PeriodFilter
 */
export function isDateInPeriod(dateStr: string | undefined | null, period: PeriodFilter): boolean {
  if (!dateStr) return false;
  if (period === 'all') return true;
  const cleanDate = normalizeDateStr(dateStr);
  if (!cleanDate) return false;
  const { start, end } = getPeriodDateRange(period);
  return cleanDate >= start && cleanDate <= end;
}

/**
 * Checks if a given date string falls within custom start and end date range
 */
export function isDateInRange(dateStr: string | undefined | null, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  const cleanDate = normalizeDateStr(dateStr);
  if (!cleanDate) return false;
  const start = startDate ? normalizeDateStr(startDate) : '1970-01-01';
  const end = endDate ? normalizeDateStr(endDate) : '2099-12-31';
  return cleanDate >= start && cleanDate <= end;
}

