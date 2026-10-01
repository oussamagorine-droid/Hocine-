import * as XLSX from 'xlsx';
import { Product, Sale, Customer, Supplier } from '../types';

export interface ParsedExcelRow {
  [key: string]: any;
}

export interface ExcelColumnMapping {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  stockQuantity: string;
  minStockAlert: string;
  expiryDate: string;
}

/**
 * Generate a pre-filled, professionally structured Arabic Excel template (.xlsx)
 */
export function generateStoreTemplateExcel(): void {
  const sampleData = [
    {
      'اسم المنتج': 'سكر أبيض ناعم 1 كغ',
      'الباركود': '6131234560001',
      'التصنيف': 'مواد غذائية عامة وبقوليات',
      'الوحدة': 'piece',
      'سعر الشراء (د.ج)': 90,
      'سعر البيع (د.ج)': 100,
      'الكمية المتوفرة': 50,
      'الحد الأدنى للتنبيه': 10,
      'تاريخ انتهاء الصلاحية': '2027-12-31',
      'ملاحظات': 'عينة تجريبية',
    },
    {
      'اسم المنتج': 'زيت المائدة 5 لتر',
      'الباركود': '6131234560002',
      'التصنيف': 'زيوت وسمن وصلصات',
      'الوحدة': 'piece',
      'سعر الشراء (د.ج)': 580,
      'سعر البيع (د.ج)': 650,
      'الكمية المتوفرة': 24,
      'الحد الأدنى للتنبيه': 5,
      'تاريخ انتهاء الصلاحية': '2027-06-30',
      'ملاحظات': 'عافية / سيفيتال',
    },
    {
      'اسم المنتج': 'طماطم طازجة محلية',
      'الباركود': '200001',
      'التصنيف': 'خضروات وفواكه طازجة',
      'الوحدة': 'kg',
      'سعر الشراء (د.ج)': 90,
      'سعر البيع (د.ج)': 130,
      'الكمية المتوفرة': 35,
      'الحد الأدنى للتنبيه': 10,
      'تاريخ انتهاء الصلاحية': '',
      'ملاحظات': 'منتج ميزان (بالوزن)',
    },
    {
      'اسم المنتج': 'جبن أحمر غودا (بالوزن)',
      'الباركود': '200006',
      'التصنيف': 'ألبان وأجبان ومشتقاتها',
      'الوحدة': 'kg',
      'سعر الشراء (د.ج)': 1200,
      'سعر البيع (د.ج)': 1650,
      'الكمية المتوفرة': 8.5,
      'الحد الأدنى للتنبيه': 2,
      'تاريخ انتهاء الصلاحية': '2026-11-20',
      'ملاحظات': 'منتج ميزان',
    },
    {
      'اسم المنتج': 'حليب معقم 1 لتر',
      'الباركود': '6131234560003',
      'التصنيف': 'ألبان وأجبان ومشتقاتها',
      'الوحدة': 'pack',
      'سعر الشراء (د.ج)': 95,
      'سعر البيع (د.ج)': 120,
      'الكمية المتوفرة': 72,
      'الحد الأدنى للتنبيه': 15,
      'تاريخ انتهاء الصلاحية': '2026-10-15',
      'ملاحظات': 'كانديا أو صومام',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for readability in Excel
  ws['!cols'] = [
    { wch: 30 }, // اسم المنتج
    { wch: 18 }, // الباركود
    { wch: 25 }, // التصنيف
    { wch: 12 }, // الوحدة
    { wch: 16 }, // سعر الشراء
    { wch: 16 }, // سعر البيع
    { wch: 16 }, // الكمية المتوفرة
    { wch: 18 }, // الحد الأدنى للتنبيه
    { wch: 20 }, // تاريخ الصلاحية
    { wch: 22 }, // ملاحظات
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
  XLSX.writeFile(wb, 'قالب_بيانات_المنتجات_للبقالة.xlsx');
}

/**
 * Export products to a clean Microsoft Excel workbook
 */
export function exportProductsToExcel(products: Product[]): void {
  const data = products.map((p) => ({
    'معرف المنتج': p.id || '',
    'اسم المنتج': p.name,
    'الباركود': p.barcode,
    'التصنيف': p.category,
    'الوحدة': p.unit,
    'سعر الشراء (د.ج)': p.costPrice,
    'سعر البيع (د.ج)': p.sellingPrice,
    'هامش الربح (%)': p.profitMargin ? `${p.profitMargin}%` : '',
    'الكمية الحالية': p.stockQuantity,
    'إجمالي قيمة المخزون شراء': p.stockQuantity * p.costPrice,
    'إجمالي قيمة المخزون بيع': p.stockQuantity * p.sellingPrice,
    'الحد الأدنى للتنبيه': p.minStockAlert,
    'تاريخ انتهاء الصلاحية': p.expiryDate || 'غير محدد',
    'نوع السلعة': p.isScaleItem ? 'ميزان (وزن)' : 'قطعة / علبة',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 25 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'المخزون والمنتجات');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `قائمة_مخزون_المحل_${dateStr}.xlsx`);
}

/**
 * Export complete multi-sheet store workbook (Inventory, Sales, Debts, Customers)
 */
export function exportCompleteStoreToExcel(
  products: Product[],
  sales: Sale[],
  customers: Customer[],
  suppliers: Supplier[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Products
  const productsData = products.map((p) => ({
    'الباركود': p.barcode,
    'اسم المنتج': p.name,
    'التصنيف': p.category,
    'الوحدة': p.unit,
    'سعر الشراء': p.costPrice,
    'سعر البيع': p.sellingPrice,
    'الكمية في المخزن': p.stockQuantity,
    'قيمة المخزون (شراء)': p.stockQuantity * p.costPrice,
    'تاريخ الصلاحية': p.expiryDate || '',
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'المنتجات والمخزون');

  // 2. Sheet: Sales
  const salesData = sales.map((s) => ({
    'رقم الفاتورة': s.invoiceNumber,
    'التاريخ': s.date,
    'الوقت': s.time,
    'اسم الزبون': s.customerName,
    'عدد الأصناف': s.items.length,
    'إجمالي الفاتورة': s.totalAmount,
    'المبلغ المدفوع': s.paidAmount,
    'المتبقي دين': s.remainingDebt,
    'طريقة الدفع': s.paymentMethod,
    'صافي ربح الفاتورة': s.profit,
    'الكاشير': s.cashierName,
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesData);
  XLSX.utils.book_append_sheet(wb, wsSales, 'أرشيف المبيعات');

  // 3. Sheet: Customers & Debts
  const customersData = customers.map((c) => ({
    'اسم الزبون': c.name,
    'الهاتف': c.phone || '',
    'إجمالي الدين الحالي': c.totalDebt,
    'إجمالي المشتريات': c.totalSpent,
    'ملاحظات': c.notes || '',
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customersData);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'ديون وسجل الزبائن');

  // 4. Sheet: Suppliers
  const suppliersData = suppliers.map((sup) => ({
    'اسم المورد': sup.name,
    'الشركة / النشاط': sup.company || '',
    'الهاتف': sup.phone || '',
    'مستحقات المورد (ديون علينا)': sup.totalDebt,
    'إجمالي التوريدات': sup.totalPurchases,
  }));
  const wsSuppliers = XLSX.utils.json_to_sheet(suppliersData);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'سجل الموردين');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `قاعدة_بيانات_المحل_الشاملة_${dateStr}.xlsx`);
}

/**
 * Read and parse an Excel (.xlsx / .xls) file from browser File
 */
export async function parseExcelFile(
  file: File
): Promise<{ sheetNames: string[]; sheetsData: Record<string, ParsedExcelRow[]> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetsData: Record<string, ParsedExcelRow[]> = {};

        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<ParsedExcelRow>(sheet, { defval: '' });
          sheetsData[sheetName] = json;
        });

        resolve({
          sheetNames: wb.SheetNames,
          sheetsData,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Automatically guess column mappings based on common Arabic, French, and English header keywords
 */
export function guessColumnMapping(headers: string[]): ExcelColumnMapping {
  const findMatch = (keywords: string[]): string => {
    const found = headers.find((h) => {
      const lower = h.trim().toLowerCase();
      return keywords.some((k) => lower.includes(k.toLowerCase()));
    });
    return found || '';
  };

  return {
    name: findMatch(['اسم', 'المنتج', 'سلعة', 'بضاعة', 'désignation', 'designation', 'name', 'product', 'item', 'libellé']),
    barcode: findMatch(['باركود', 'كود', 'code', 'barcode', 'ean', 'ref', 'رقم']),
    category: findMatch(['تصنيف', 'صنف', 'فئة', 'قسم', 'catégorie', 'categorie', 'category', 'famille']),
    unit: findMatch(['وحدة', 'unit', 'unité', 'قياس']),
    costPrice: findMatch(['شراء', 'جملة', 'تكلفة', 'prix achat', 'achat', 'cost', 'buy', 'p.a']),
    sellingPrice: findMatch(['بيع', 'تجزئة', 'سعر', 'prix vente', 'vente', 'price', 'sell', 'p.v']),
    stockQuantity: findMatch(['كمية', 'مخزون', 'رصيد', 'quantité', 'quantite', 'qte', 'stock', 'qty', 'solde']),
    minStockAlert: findMatch(['حد', 'أدنى', 'إنذار', 'تنبيه', 'alerte', 'min', 'seuil']),
    expiryDate: findMatch(['صلاحية', 'انتهاء', 'péremption', 'peremption', 'expiry', 'exp', 'date']),
  };
}
