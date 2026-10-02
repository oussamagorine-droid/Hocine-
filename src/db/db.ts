import Dexie, { Table } from 'dexie';
import {
  AppUser,
  BackupRecord,
  Category,
  Customer,
  CustomerPayment,
  Expense,
  Product,
  Purchase,
  Sale,
  StockMovement,
  StoreSettings,
  Supplier,
  SupplierPayment,
} from '../types';
import {
  defaultSettings,
  initialCategories,
  initialCustomers,
  initialExpenses,
  initialProducts,
  initialSuppliers,
  initialUsers,
} from './seedData';
import { generateInvoiceNumber } from '../utils/formatters';
import { getSmartProductImage, ensureImageAsBase64 } from '../utils/productImageUtils';

export class GroceryDatabase extends Dexie {
  products!: Table<Product, number>;
  categories!: Table<Category, number>;
  sales!: Table<Sale, number>;
  purchases!: Table<Purchase, number>;
  customers!: Table<Customer, number>;
  customerPayments!: Table<CustomerPayment, number>;
  suppliers!: Table<Supplier, number>;
  supplierPayments!: Table<SupplierPayment, number>;
  expenses!: Table<Expense, number>;
  stockMovements!: Table<StockMovement, number>;
  users!: Table<AppUser, number>;
  settings!: Table<StoreSettings, number>;
  backups!: Table<BackupRecord, number>;

  constructor() {
    super('GroceryStorePOSDB');

    this.version(1).stores({
      products: '++id, name, barcode, category, unit, isScaleItem, supplierId, expiryDate, stockQuantity',
      categories: '++id, name',
      sales: '++id, invoiceNumber, date, time, customerId, paymentMethod, status, cashierId',
      purchases: '++id, invoiceNumber, date, supplierId',
      customers: '++id, name, phone',
      customerPayments: '++id, customerId, date, receiptNumber',
      suppliers: '++id, name, phone',
      supplierPayments: '++id, supplierId, date, receiptNumber',
      expenses: '++id, category, date',
      stockMovements: '++id, productId, type, date',
      users: '++id, username, role, pinCode, isActive',
      settings: '++id',
      backups: '++id, date',
    });
  }
}

export const db = new GroceryDatabase();

let seedPromise: Promise<void> | null = null;

// Seed initial database if empty
export function seedDatabaseIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeedDatabaseIfEmpty().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function doSeedDatabaseIfEmpty(): Promise<void> {
  try {
    // Ensure DB is open with a 3-second timeout
    await Promise.race([
      db.open(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB open timeout')), 3000)),
    ]).catch((e) => {
      console.warn('DB open warning:', e);
    });

    const [productCount, categoryCount, userCount] = await Promise.all([
      db.products.count().catch(() => 0),
      db.categories.count().catch(() => 0),
      db.users.count().catch(() => 0),
    ]);

    const isCleared = localStorage.getItem('grocery_pos_cleared') === 'true';

    // If already populated, or if user explicitly chose to have an empty store, exit quickly
    if ((productCount > 0 && categoryCount > 0 && userCount > 0) || (isCleared && categoryCount > 0 && userCount > 0)) {
      return;
    }

    // If user cleared demo data, only make sure categories, admin user, and settings exist
    if (isCleared) {
      if (categoryCount === 0) {
        await db.categories.bulkPut(initialCategories).catch((e) => console.warn('Cat seed err:', e));
      }
      if (userCount === 0) {
        await db.users.bulkPut(initialUsers).catch((e) => console.warn('User seed err:', e));
      }
      const setCount = await db.settings.count().catch(() => 0);
      if (setCount === 0) {
        await db.settings.put({ ...defaultSettings, id: 1 }).catch((e) => console.warn('Settings seed err:', e));
      }
      return;
    }

    console.log('Seeding initial grocery store data...');

    // Populate each store independently with bulkPut so there are no transaction deadlocks or duplicate key errors
    if (categoryCount === 0) {
      await db.categories.bulkPut(initialCategories).catch((e) => console.warn('Cat seed err:', e));
    }
    const supCount = await db.suppliers.count().catch(() => 0);
    if (supCount === 0) {
      await db.suppliers.bulkPut(initialSuppliers).catch((e) => console.warn('Sup seed err:', e));
    }
    const custCount = await db.customers.count().catch(() => 0);
    if (custCount === 0) {
      await db.customers.bulkPut(initialCustomers).catch((e) => console.warn('Cust seed err:', e));
    }
    if (productCount === 0) {
      await db.products.bulkPut(initialProducts).catch((e) => console.warn('Prod seed err:', e));
    }
    const expCount = await db.expenses.count().catch(() => 0);
    if (expCount === 0) {
      await db.expenses.bulkPut(initialExpenses).catch((e) => console.warn('Exp seed err:', e));
    }
    if (userCount === 0) {
      await db.users.bulkPut(initialUsers).catch((e) => console.warn('User seed err:', e));
    }
    const setCount = await db.settings.count().catch(() => 0);
    if (setCount === 0) {
      await db.settings.put({ ...defaultSettings, id: 1 }).catch((e) => console.warn('Settings seed err:', e));
    }

    const currentSalesCount = await db.sales.count().catch(() => 0);
    if (currentSalesCount === 0) {
      const sampleSales: Sale[] = [
        {
          id: 1,
          invoiceNumber: 'INV-2026-001',
          date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          time: '10:30:00',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          customerId: 1,
          customerName: 'محمد بن علي (زبون دائم)',
          customerPhone: '0555112233',
          items: [
            {
              productId: 1,
              productName: 'طماطم طازجة محلية',
              barcode: '200001',
              unit: 'kg',
              isScaleItem: true,
              quantity: 1.5,
              weightGrams: 1500,
              costPrice: 90,
              unitPrice: 130,
              discount: 0,
              total: 195,
              profit: 60,
            },
            {
              productId: 8,
              productName: 'زيت المائدة عافية 5 لتر',
              barcode: '6131234567890',
              unit: 'piece',
              isScaleItem: false,
              quantity: 1,
              costPrice: 580,
              unitPrice: 650,
              discount: 0,
              total: 650,
              profit: 70,
            },
            {
              productId: 11,
              productName: 'حليب معقم كامل الدسم 1 لتر',
              barcode: '6131234567893',
              unit: 'pack',
              isScaleItem: false,
              quantity: 2,
              costPrice: 95,
              unitPrice: 120,
              discount: 0,
              total: 240,
              profit: 50,
            },
          ],
          subtotal: 1085,
          discount: 0,
          tax: 0,
          totalAmount: 1085,
          paidAmount: 1085,
          remainingDebt: 0,
          paymentMethod: 'cash',
          totalCost: 905,
          profit: 180,
          cashierId: 1,
          cashierName: 'مدير المحل (المسؤول العام)',
          status: 'completed',
        },
        {
          id: 2,
          invoiceNumber: 'INV-2026-002',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          time: '15:45:00',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          customerId: 2,
          customerName: 'كريم بلحاج',
          customerPhone: '0666445566',
          items: [
            {
              productId: 6,
              productName: 'جبن أحمر غودا (بالوزن)',
              barcode: '200006',
              unit: 'kg',
              isScaleItem: true,
              quantity: 0.5,
              weightGrams: 500,
              costPrice: 1200,
              unitPrice: 1650,
              discount: 0,
              total: 825,
              profit: 225,
            },
            {
              productId: 10,
              productName: 'قهوة مطحونة فاميكو 250غ',
              barcode: '6131234567892',
              unit: 'piece',
              isScaleItem: false,
              quantity: 2,
              costPrice: 220,
              unitPrice: 270,
              discount: 0,
              total: 540,
              profit: 100,
            },
          ],
          subtotal: 1365,
          discount: 0,
          tax: 0,
          totalAmount: 1365,
          paidAmount: 1000,
          remainingDebt: 365,
          paymentMethod: 'partial',
          totalCost: 1040,
          profit: 325,
          cashierId: 2,
          cashierName: 'أحمد - كاشير الصباح',
          status: 'completed',
          notes: 'دفع 1000 د.ج والباقي 365 د.ج على حسابه',
        },
      ];

      await db.sales.bulkPut(sampleSales).catch((e) => console.warn('Sales seed err:', e));
    }

    const currentMovCount = await db.stockMovements.count().catch(() => 0);
    if (currentMovCount === 0) {
      const movements: StockMovement[] = initialProducts.map((p, idx) => ({
        id: idx + 1,
        productId: p.id!,
        productName: p.name,
        type: 'purchase',
        quantityChange: p.stockQuantity,
        previousStock: 0,
        newStock: p.stockQuantity,
        unit: p.unit,
        date: new Date().toISOString().split('T')[0],
        reason: 'رصيد افتتاحي للمخزون',
        createdAt: new Date().toISOString(),
      }));

      await db.stockMovements.bulkPut(movements).catch((e) => console.warn('Mov seed err:', e));
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error during doSeedDatabaseIfEmpty:', error);
  }
}

// Transaction: Process Sale with Stock Deduction & Ledger Recording
export async function executeSaleTransaction(saleData: Omit<Sale, 'id'>): Promise<number> {
  return await db.transaction('rw', [db.sales, db.products, db.stockMovements, db.customers], async () => {
    // 1. Save Sale record
    const saleId = await db.sales.add(saleData as Sale);

    // 2. Deduct stock for each item & record movement
    for (const item of saleData.items) {
      const product = await db.products.get(item.productId);
      if (product) {
        const previousStock = product.stockQuantity;
        const newStock = Math.max(0, previousStock - item.quantity);

        await db.products.update(item.productId, {
          stockQuantity: Math.round(newStock * 1000) / 1000,
          updatedAt: new Date().toISOString(),
        });

        await db.stockMovements.add({
          productId: item.productId,
          productName: item.productName,
          type: 'sale',
          quantityChange: -item.quantity,
          previousStock,
          newStock,
          unit: item.unit,
          date: saleData.date,
          reason: `عملية بيع فاتورة #${saleData.invoiceNumber}`,
          referenceId: saleData.invoiceNumber,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Update customer stats & debt if customer attached
    if (saleData.customerId) {
      const customer = await db.customers.get(saleData.customerId);
      if (customer) {
        await db.customers.update(saleData.customerId, {
          totalSpent: (customer.totalSpent || 0) + saleData.totalAmount,
          totalPaid: (customer.totalPaid || 0) + saleData.paidAmount,
          totalDebt: (customer.totalDebt || 0) + saleData.remainingDebt,
          lastPurchaseDate: saleData.date,
        });
      }
    }

    return saleId;
  });
}

// Transaction: Process Purchase with Stock Addition & Supplier Debt Update
export async function executePurchaseTransaction(purchaseData: Omit<Purchase, 'id'>): Promise<number> {
  return await db.transaction('rw', [db.purchases, db.products, db.stockMovements, db.suppliers], async () => {
    // 1. Save Purchase record
    const purchaseId = await db.purchases.add(purchaseData as Purchase);

    // 2. Increase stock for each item & update cost price if provided
    for (const item of purchaseData.items) {
      const product = await db.products.get(item.productId);
      if (product) {
        const previousStock = product.stockQuantity;
        const newStock = previousStock + item.quantity;

        const updatePayload: Partial<Product> = {
          stockQuantity: Math.round(newStock * 1000) / 1000,
          costPrice: item.unitCost,
          updatedAt: new Date().toISOString(),
        };

        if (item.sellingPrice && item.sellingPrice > 0) {
          updatePayload.sellingPrice = item.sellingPrice;
          updatePayload.profitMargin = ((item.sellingPrice - item.unitCost) / item.unitCost) * 100;
        }

        if (item.expiryDate) {
          updatePayload.expiryDate = item.expiryDate;
        }

        await db.products.update(item.productId, updatePayload);

        await db.stockMovements.add({
          productId: item.productId,
          productName: item.productName,
          type: 'purchase',
          quantityChange: item.quantity,
          previousStock,
          newStock,
          unit: item.unit,
          date: purchaseData.date,
          reason: `فاتورة شراء توريد #${purchaseData.invoiceNumber}`,
          referenceId: purchaseData.invoiceNumber,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Update supplier balance
    const supplier = await db.suppliers.get(purchaseData.supplierId);
    if (supplier) {
      await db.suppliers.update(purchaseData.supplierId, {
        totalPurchases: (supplier.totalPurchases || 0) + purchaseData.totalCost,
        totalPaid: (supplier.totalPaid || 0) + purchaseData.paidAmount,
        totalDebt: (supplier.totalDebt || 0) + purchaseData.remainingDebt,
      });
    }

    return purchaseId;
  });
}

// Record Debt Payment (Customer or Supplier)
export async function recordDebtPayment(
  type: 'customer' | 'supplier',
  entityId: number,
  entityName: string,
  amount: number,
  notes?: string
): Promise<number> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const receiptNumber = generateInvoiceNumber('PAY');

  if (type === 'customer') {
    return await db.transaction('rw', [db.customers, db.customerPayments], async () => {
      const cust = await db.customers.get(entityId);
      if (!cust) throw new Error('Customer not found');

      const newDebt = Math.max(0, (cust.totalDebt || 0) - amount);
      const newPaid = (cust.totalPaid || 0) + amount;

      await db.customers.update(entityId, {
        totalDebt: newDebt,
        totalPaid: newPaid,
      });

      return await db.customerPayments.add({
        customerId: entityId,
        customerName: entityName,
        date: dateStr,
        amount,
        paymentMethod: 'cash',
        notes: notes || 'تسديد دفعة دين',
        receiptNumber,
        createdAt: now.toISOString(),
      });
    });
  } else {
    return await db.transaction('rw', [db.suppliers, db.supplierPayments], async () => {
      const sup = await db.suppliers.get(entityId);
      if (!sup) throw new Error('Supplier not found');

      const newDebt = Math.max(0, (sup.totalDebt || 0) - amount);
      const newPaid = (sup.totalPaid || 0) + amount;

      await db.suppliers.update(entityId, {
        totalDebt: newDebt,
        totalPaid: newPaid,
      });

      return await db.supplierPayments.add({
        supplierId: entityId,
        supplierName: entityName,
        date: dateStr,
        amount,
        paymentMethod: 'cash',
        notes: notes || 'تسديد دفعة للمورد',
        receiptNumber,
        createdAt: now.toISOString(),
      });
    });
  }
}

// Export Complete Database as JSON with full offline Base64 product image embedding
export async function exportDatabaseBackup(): Promise<string> {
  const rawProducts = await db.products.toArray();

  // Convert any external remote image URLs to offline Base64 data URIs
  const products = await Promise.all(
    rawProducts.map(async (p) => {
      const rawImg = p.image || getSmartProductImage(p.name, p.category);
      const base64Img = await ensureImageAsBase64(rawImg);
      return {
        ...p,
        image: base64Img,
      };
    })
  );

  const categories = await db.categories.toArray();
  const sales = await db.sales.toArray();
  const purchases = await db.purchases.toArray();
  const customers = await db.customers.toArray();
  const customerPayments = await db.customerPayments.toArray();
  const suppliers = await db.suppliers.toArray();
  const supplierPayments = await db.supplierPayments.toArray();
  const expenses = await db.expenses.toArray();
  const stockMovements = await db.stockMovements.toArray();
  const users = await db.users.toArray();
  const settings = await db.settings.toArray();

  const backupObj = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    appName: 'Grocery POS Desktop System',
    tables: {
      products,
      categories,
      sales,
      purchases,
      customers,
      customerPayments,
      suppliers,
      supplierPayments,
      expenses,
      stockMovements,
      users,
      settings,
    },
  };

  return JSON.stringify(backupObj, null, 2);
}

// Restore Database from JSON
export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.tables) {
      throw new Error('الملف غير صالح أو لا يحتوي على بنية قاعدة بيانات صحيحة');
    }

    await db.transaction('rw', [
      db.products,
      db.categories,
      db.sales,
      db.purchases,
      db.customers,
      db.customerPayments,
      db.suppliers,
      db.supplierPayments,
      db.expenses,
      db.stockMovements,
      db.users,
      db.settings,
    ], async () => {
      // Clear all
      await db.products.clear();
      await db.categories.clear();
      await db.sales.clear();
      await db.purchases.clear();
      await db.customers.clear();
      await db.customerPayments.clear();
      await db.suppliers.clear();
      await db.supplierPayments.clear();
      await db.expenses.clear();
      await db.stockMovements.clear();
      await db.users.clear();
      await db.settings.clear();

      // Bulk restore using bulkPut for resilience with guaranteed image preservation
      if (data.tables.products?.length) {
        const restoredProducts = data.tables.products.map((p: any) => ({
          ...p,
          image: p.image || getSmartProductImage(p.name || '', p.category || ''),
        }));
        await db.products.bulkPut(restoredProducts);
      }
      if (data.tables.categories?.length) await db.categories.bulkPut(data.tables.categories);
      if (data.tables.sales?.length) await db.sales.bulkPut(data.tables.sales);
      if (data.tables.purchases?.length) await db.purchases.bulkPut(data.tables.purchases);
      if (data.tables.customers?.length) await db.customers.bulkPut(data.tables.customers);
      if (data.tables.customerPayments?.length) await db.customerPayments.bulkPut(data.tables.customerPayments);
      if (data.tables.suppliers?.length) await db.suppliers.bulkPut(data.tables.suppliers);
      if (data.tables.supplierPayments?.length) await db.supplierPayments.bulkPut(data.tables.supplierPayments);
      if (data.tables.expenses?.length) await db.expenses.bulkPut(data.tables.expenses);
      if (data.tables.stockMovements?.length) await db.stockMovements.bulkPut(data.tables.stockMovements);
      if (data.tables.users?.length) await db.users.bulkPut(data.tables.users);
      if (data.tables.settings?.length) await db.settings.bulkPut(data.tables.settings);
    });

    return true;
  } catch (err) {
    console.error('Failed to restore database:', err);
    throw err;
  }
}

// Reset to Factory Seed
export async function resetDatabaseToSeed(): Promise<void> {
  localStorage.removeItem('grocery_pos_cleared');
  
  const tables = [
    db.products,
    db.categories,
    db.sales,
    db.purchases,
    db.customers,
    db.customerPayments,
    db.suppliers,
    db.supplierPayments,
    db.expenses,
    db.stockMovements,
    db.users,
    db.settings,
    db.backups,
  ];

  for (const table of tables) {
    try {
      await table.clear();
    } catch (e) {
      console.warn('Error clearing table during reset:', e);
    }
  }

  seedPromise = null;
  await seedDatabaseIfEmpty();
}

// Clear all demo data so user can start with a fresh, clean store
export async function clearDatabaseForNewStore(): Promise<void> {
  localStorage.setItem('grocery_pos_cleared', 'true');
  
  const tablesToClear = [
    db.products,
    db.sales,
    db.purchases,
    db.customers,
    db.customerPayments,
    db.suppliers,
    db.supplierPayments,
    db.expenses,
    db.stockMovements,
    db.backups,
  ];

  for (const table of tablesToClear) {
    try {
      await table.clear();
    } catch (e) {
      console.warn('Error clearing table for new store:', e);
    }
  }
}

// Restore Database from Excel sheets data
export async function importExcelDatabase(sheetsData: Record<string, any[]>): Promise<boolean> {
  try {
    await db.transaction('rw', [
      db.products,
      db.categories,
      db.sales,
      db.purchases,
      db.customers,
      db.suppliers,
      db.expenses,
    ], async () => {
      await db.products.clear();
      await db.categories.clear();
      await db.sales.clear();
      await db.purchases.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      await db.expenses.clear();

      // 1. Products
      const productsSheet = sheetsData['المنتجات والمخزون'] || sheetsData['المنتجات'] || [];
      const mappedProducts = productsSheet.map((row, idx) => ({
        id: Number(row['معرف المنتج']) || idx + 1,
        name: String(row['اسم المنتج'] || 'منتج بدون اسم'),
        barcode: String(row['الباركود'] || `GEN-${Date.now()}-${idx}`),
        category: String(row['التصنيف'] || 'مواد غذائية عامة'),
        unit: String(row['الوحدة'] || 'piece'),
        costPrice: Number(row['سعر الشراء'] || 0),
        sellingPrice: Number(row['سعر البيع'] || 0),
        profitMargin: Number(row['هامش الربح (%)'] || 15),
        stockQuantity: Number(row['الكمية في المخزن'] || 10),
        minStockAlert: 5,
        expiryDate: String(row['تاريخ الصلاحية'] || ''),
        isScaleItem: String(row['نوع السلعة'] || '').includes('ميزان'),
        image: String(row['رابط صورة المنتج'] || row['رابط الصورة'] || row['الصورة'] || getSmartProductImage(String(row['اسم المنتج'] || ''), String(row['التصنيف'] || ''))),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      if (mappedProducts.length > 0) {
        await db.products.bulkPut(mappedProducts as any);
      }

      // 2. Sales
      const salesSheet = sheetsData['أرشيف المبيعات والأرباح'] || sheetsData['أرشيف المبيعات'] || [];
      const mappedSales = salesSheet.map((row, idx) => ({
        id: Number(row['معرف الفاتورة']) || idx + 1,
        invoiceNumber: String(row['رقم الفاتورة'] || `INV-${idx + 1}`),
        date: String(row['التاريخ'] || new Date().toISOString().split('T')[0]),
        time: String(row['الوقت'] || '12:00:00'),
        createdAt: new Date().toISOString(),
        customerName: String(row['اسم الزبون'] || 'زبون عابر'),
        items: [],
        subtotal: Number(row['إجمالي الفاتورة'] || 0),
        discount: 0,
        tax: 0,
        totalAmount: Number(row['إجمالي الفاتورة'] || 0),
        paidAmount: Number(row['المبلغ المدفوع'] || row['إجمالي الفاتورة'] || 0),
        remainingDebt: Number(row['المتبقي دين'] || 0),
        paymentMethod: (String(row['طريقة الدفع'] || 'cash') as any),
        totalCost: 0,
        profit: Number(row['صافي ربح الفاتورة'] || 0),
        cashierName: String(row['الكاشير'] || 'المدير العام'),
        status: 'completed' as const,
      }));
      if (mappedSales.length > 0) {
        await db.sales.bulkPut(mappedSales as any);
      }

      // 3. Customers & Debts (الكريدي)
      const customersSheet = sheetsData['الزبائن والكريدي والديون'] || sheetsData['ديون وسجل الزبائن'] || [];
      const mappedCustomers = customersSheet.map((row, idx) => ({
        id: Number(row['معرف الزبون']) || idx + 1,
        name: String(row['اسم الزبون'] || 'زبون'),
        phone: String(row['الهاتف'] || ''),
        totalDebt: Number(row['إجمالي الدين الحالي'] || 0),
        totalSpent: Number(row['إجمالي المشتريات'] || 0),
        notes: String(row['ملاحظات'] || ''),
        createdAt: new Date().toISOString(),
      }));
      if (mappedCustomers.length > 0) {
        await db.customers.bulkPut(mappedCustomers as any);
      }

      // 4. Purchases
      const purchasesSheet = sheetsData['المشتريات والتوريدات'] || sheetsData['المشتريات'] || [];
      const mappedPurchases = purchasesSheet.map((row, idx) => ({
        id: Number(row['معرف المشتريات']) || idx + 1,
        invoiceNumber: String(row['رقم الفاتورة'] || ''),
        supplierName: String(row['المورد'] || ''),
        date: String(row['التاريخ'] || new Date().toISOString().split('T')[0]),
        items: [],
        totalAmount: Number(row['إجمالي التوريد'] || 0),
        paidAmount: Number(row['المبلغ المدفوع'] || 0),
        remainingDebt: 0,
        notes: String(row['ملاحظات'] || ''),
        createdAt: new Date().toISOString(),
      }));
      if (mappedPurchases.length > 0) {
        await db.purchases.bulkPut(mappedPurchases as any);
      }

      // 5. Expenses
      const expensesSheet = sheetsData['المصروفات اليومية'] || sheetsData['المصروفات'] || [];
      const mappedExpenses = expensesSheet.map((row, idx) => ({
        id: Number(row['معرف المصروف']) || idx + 1,
        title: String(row['عنوان المصروف'] || 'مصروف عام'),
        amount: Number(row['المبلغ'] || 0),
        date: String(row['التاريخ'] || new Date().toISOString().split('T')[0]),
        category: String(row['التصنيف'] || 'مصاريف تشغيلية'),
        notes: String(row['ملاحظات'] || ''),
        createdAt: new Date().toISOString(),
      }));
      if (mappedExpenses.length > 0) {
        await db.expenses.bulkPut(mappedExpenses as any);
      }

      // 6. Suppliers
      const suppliersSheet = sheetsData['سجل الموردين'] || sheetsData['الموردين'] || [];
      const mappedSuppliers = suppliersSheet.map((row, idx) => ({
        id: Number(row['معرف المورد']) || idx + 1,
        name: String(row['اسم المورد'] || 'مورد'),
        company: String(row['الشركة / النشاط'] || ''),
        phone: String(row['الهاتف'] || ''),
        totalDebt: Number(row['مستحقات المورد (ديون علينا)'] || 0),
        totalPurchases: Number(row['إجمالي التوريدات'] || 0),
        createdAt: new Date().toISOString(),
      }));
      if (mappedSuppliers.length > 0) {
        await db.suppliers.bulkPut(mappedSuppliers as any);
      }

      // 7. Categories
      const categoriesSheet = sheetsData['التصنيفات'] || [];
      const mappedCategories = categoriesSheet.map((row, idx) => ({
        id: idx + 1,
        name: String(row['اسم التصنيف'] || 'عام'),
        createdAt: new Date().toISOString(),
      }));
      if (mappedCategories.length > 0) {
        await db.categories.bulkPut(mappedCategories as any);
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to import Excel database:', err);
    throw err;
  }
}

