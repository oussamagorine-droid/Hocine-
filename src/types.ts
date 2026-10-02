export type UnitType = 'piece' | 'kg' | 'g' | 'liter' | 'box' | 'carton' | 'pack';

export interface Product {
  id?: number;
  name: string;
  category: string;
  barcode: string;
  unit: UnitType;
  stockQuantity: number; // In base unit (e.g. kg for weight items, pieces for piece items)
  minStockAlert: number;
  costPrice: number; // Purchase price per unit
  sellingPrice: number; // Selling price per unit
  profitMargin?: number; // Calculated: ((sellingPrice - costPrice) / costPrice) * 100
  purchaseDate?: string;
  expiryDate?: string;
  supplierId?: number;
  supplierName?: string;
  notes?: string;
  isScaleItem: boolean; // True if sold by weight (kg/g)
  image?: string;
  boxSize?: number; // Number of items in carton/box (e.g. 30 for eggs, 6 for drinks)
  pieceCostPrice?: number; // Custom piece cost price
  pieceSellingPrice?: number; // Custom piece selling price
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  icon?: string;
  color?: string;
}

export interface SaleItem {
  productId: number;
  productName: string;
  barcode: string;
  unit: UnitType;
  isScaleItem: boolean;
  quantity: number; // Quantity in pieces or Weight in Kg
  weightGrams?: number; // If sold by weight, e.g. 500g
  costPrice: number; // Unit cost price at time of sale
  unitPrice: number; // Unit selling price at time of sale
  discount: number; // Discount on this line item in currency
  total: number; // (quantity * unitPrice) - discount
  profit: number; // total - (quantity * costPrice)
}

export type PaymentMethod = 'cash' | 'credit' | 'partial' | 'card';

export interface Sale {
  id?: number;
  invoiceNumber: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:mm:ss
  createdAt: string;
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  paymentMethod: PaymentMethod;
  totalCost: number;
  profit: number; // totalAmount - totalCost - discount
  cashierId?: number;
  cashierName: string;
  notes?: string;
  status: 'completed' | 'refunded' | 'cancelled';
}

export interface PurchaseItem {
  productId: number;
  productName: string;
  unit: UnitType;
  isScaleItem: boolean;
  quantity: number;
  unitCost: number;
  totalCost: number;
  sellingPrice?: number;
  expiryDate?: string;
}

export interface Purchase {
  id?: number;
  invoiceNumber: string;
  date: string;
  supplierId: number;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  paidAmount: number;
  remainingDebt: number;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address?: string;
  totalSpent: number;
  totalDebt: number;
  totalPaid: number;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id?: number;
  customerId: number;
  customerName: string;
  saleId?: number;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  receiptNumber: string;
  createdAt: string;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  address?: string;
  company?: string;
  totalPurchases: number;
  totalDebt: number;
  totalPaid: number;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id?: number;
  supplierId: number;
  supplierName: string;
  purchaseId?: number;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  receiptNumber: string;
  createdAt: string;
}

export type ExpenseCategory = 'rent' | 'electricity' | 'water' | 'salaries' | 'transport' | 'maintenance' | 'taxes' | 'packaging' | 'other';

export interface Expense {
  id?: number;
  title: string;
  category: ExpenseCategory;
  categoryNameAr: string;
  amount: number;
  date: string;
  notes?: string;
  paidBy?: string;
  createdAt: string;
}

export type MovementType = 'sale' | 'purchase' | 'adjustment' | 'return' | 'loss';

export interface StockMovement {
  id?: number;
  productId: number;
  productName: string;
  type: MovementType;
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  unit: UnitType;
  date: string;
  reason: string;
  referenceId?: string | number; // invoice number or purchase id
  createdAt: string;
}

export type UserRole = 'admin' | 'cashier' | 'employee';

export interface UserPermissions {
  // شاشات العرض في القائمة الجانبية (ما يظهر للعامل)
  canAccessPos: boolean; // نقطة البيع والكاشير POS
  canAccessDashboard: boolean; // لوحة التحكم والإحصائيات
  canAccessScale: boolean; // البيع بالميزان السريع والأوزان
  canManageProducts: boolean; // إدارة المنتجات والمخزون
  canManagePurchases: boolean; // فواتير المشتريات والتوريد
  canAccessDebts: boolean; // سجل الديون والكريدي
  canAccessCustomers: boolean; // سجل الزبائن
  canAccessSuppliers: boolean; // سجل الموردين
  canManageExpenses: boolean; // تسجيل وإدارة المصاريف اليومية
  canViewProfits: boolean; // شاشة الأرباح والخسائر P&L ورؤية أسعار التكلفة
  canAccessStagnantExpiry: boolean; // المنتجات الراكدة والصلاحية
  canAccessInvoices: boolean; // أرشيف فواتير البيع والمبيعات
  canAccessReports: boolean; // التقارير الشاملة والتحليلات
  canManageUsers: boolean; // إدارة المستخدمين والصلاحيات
  canManageSettings: boolean; // إعدادات المتجر وتحديث البرنامج

  // الصلاحيات والعمليات الحساسة
  canDeleteSales: boolean; // إمكانية إلغاء وحذف فواتير البيع
  canApplyDiscount: boolean; // إمكانية تطبيق تخفيض في الفاتورة
}

export interface AppUser {
  id?: number;
  username: string;
  fullName: string;
  role: UserRole;
  pinCode: string; // 4-digit PIN for rapid desktop login
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
}

export interface StoreSettings {
  id?: number;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeCurrency: string; // e.g., د.ج, SAR, ر.س, ج.م, $
  taxRate: number; // in percentage, e.g. 0
  receiptHeader: string;
  receiptFooter: string;
  receiptLogo?: string;
  expiryAlertDays: number; // Alert if product expires within X days (e.g. 15)
  stagnantDaysThreshold: number; // Alert if no sale for X days (e.g. 30)
  enableScaleSimulator: boolean;
  autoPrintReceipt: boolean;
  paperWidth: '80mm' | '58mm' | 'A4';
  requirePinOnStartup?: boolean;
  startupTab?: 'dashboard' | 'pos' | 'scale';
  autoLockMinutes?: number;
  backupIntervalDays: number;
  lastBackupDate?: string;
  appVersion?: string;
  lastUpdateDate?: string;
  lastUpdateCommit?: string;
  lastUpdateSource?: string;
  githubRepo?: string;
}

export interface AppUpdateFile {
  name: string;
  size: number;
  type: string;
  contentSnippet?: string;
}

export interface AppUpdatePackage {
  version: string;
  buildDate?: string;
  description?: string;
  filesCount: number;
  totalSizeBytes: number;
  filesList: AppUpdateFile[];
  appName?: string;
  changesSummary?: string[];
  appliedAt?: string;
}

export interface BackupRecord {
  id?: number;
  date: string;
  filename: string;
  recordCount: number;
  sizeBytes: number;
  dataJson: string;
}

export interface HeldCart {
  id: string;
  name: string;
  time: string;
  items: SaleItem[];
  customerId?: number;
  customerName: string;
  discount: number;
}
