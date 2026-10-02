import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  Scale,
  History,
  CheckCircle2,
  X,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Grid,
  Check,
  Globe,
  Loader2,
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Category, Product, StockMovement, Supplier, UnitType } from '../types';
import { formatCurrency, generateBarcode } from '../utils/formatters';
import { exportProductsToExcel, generateStoreTemplateExcel } from '../utils/excelUtils';
import {
  getSmartProductImage,
  generateOfflineProductSvg,
  ensureImageAsBase64,
} from '../utils/productImageUtils';

export const ProductsView: React.FC = () => {
  const { settings, triggerRefresh, refreshTrigger, currentUser, setActiveTab } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'scale' | 'expired'>('all');

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('مواد غذائية عامة وبقوليات');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [formUnit, setFormUnit] = useState<UnitType>('piece');
  const [formStockQuantity, setFormStockQuantity] = useState<number>(10);
  const [formMinStockAlert, setFormMinStockAlert] = useState<number>(5);
  const [formCostPrice, setFormCostPrice] = useState<number>(100);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(130);
  const [formExpiryDate, setFormExpiryDate] = useState<string>('');
  const [formSupplierId, setFormSupplierId] = useState<number | undefined>(undefined);
  const [formIsScaleItem, setFormIsScaleItem] = useState<boolean>(false);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formBoxSize, setFormBoxSize] = useState<number>(30);
  const [formPieceSellingPrice, setFormPieceSellingPrice] = useState<number>(0);
  const [formPieceCostPrice, setFormPieceCostPrice] = useState<number>(0);
  const [useCustomPiecePrice, setUseCustomPiecePrice] = useState<boolean>(false);
  const [formImage, setFormImage] = useState<string>('');

  // Auto-set matching high-quality local library image when typing product name
  useEffect(() => {
    if (!isFormModalOpen) return;
    const q = formName.trim();
    if (!q || q.length < 2) return;

    if (!editingProduct && (!formImage || formImage.startsWith('data:image/svg'))) {
      const smartImg = getSmartProductImage(q, formCategory);
      setFormImage(smartImg);
    }
  }, [formName, formCategory, isFormModalOpen, editingProduct]);

  // Update product name in form
  const handleFormNameChange = (name: string) => {
    setFormName(name);
  };

  // When category changes
  const handleFormCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
  };

  // Stock Audit / Adjustment Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditProduct, setAuditProduct] = useState<Product | null>(null);
  const [auditNewStock, setAuditNewStock] = useState<number>(0);
  const [auditReason, setAuditReason] = useState<string>('جرد دوري للمخزون');

  // Movement Ledger Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);

  // Delete product in-app confirmation modal
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);

  // Load Data
  useEffect(() => {
    async function load() {
      const [p, c, s, m] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.suppliers.toArray(),
        db.stockMovements.toArray(),
      ]);
      setProducts(p);
      setCategories(c);
      setSuppliers(s);
      setMovements(m);
    }
    load();
  }, [refreshTrigger]);

  // Open Create Modal
  const openCreateModal = () => {
    const defaultCat = categories[0]?.name || 'مواد غذائية عامة وبقوليات';
    setEditingProduct(null);
    setFormName('');
    setFormCategory(defaultCat);
    setFormBarcode(generateBarcode());
    setFormUnit('piece');
    setFormBoxSize(30);
    setFormPieceSellingPrice(0);
    setFormPieceCostPrice(0);
    setUseCustomPiecePrice(false);
    setFormStockQuantity(10);
    setFormMinStockAlert(5);
    setFormCostPrice(100);
    setFormSellingPrice(130);
    setFormExpiryDate('');
    setFormSupplierId(suppliers[0]?.id);
    setFormIsScaleItem(false);
    setFormNotes('');
    setFormImage('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormBarcode(p.barcode);
    setFormUnit(p.unit);
    setFormBoxSize(p.boxSize || 30);
    setFormPieceSellingPrice(p.pieceSellingPrice || 0);
    setFormPieceCostPrice(p.pieceCostPrice || 0);
    setUseCustomPiecePrice(!!p.pieceSellingPrice);
    setFormStockQuantity(p.stockQuantity);
    setFormMinStockAlert(p.minStockAlert);
    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormExpiryDate(p.expiryDate || '');
    setFormSupplierId(p.supplierId);
    setFormIsScaleItem(p.isScaleItem);
    setFormNotes(p.notes || '');
    const currentImg = p.image || getSmartProductImage(p.name, p.category);
    setFormImage(currentImg);
    setIsFormModalOpen(true);
  };

  // Open Audit Modal
  const openAuditModal = (p: Product) => {
    setAuditProduct(p);
    setAuditNewStock(p.stockQuantity);
    setAuditReason('جرد فعلي للمخزن');
    setIsAuditModalOpen(true);
  };

  // Open Movement History Modal
  const openHistoryModal = async (p: Product) => {
    setHistoryProduct(p);
    const movs = await db.stockMovements.where('productId').equals(p.id!).reverse().toArray();
    setProductMovements(movs);
  };

  // Submit Product Form (Create / Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBarcode.trim()) {
      alert('يرجى كتابة اسم المنتج ورقم الباركود');
      return;
    }

    const sup = suppliers.find((s) => s.id === formSupplierId);
    const profitMargin =
      formCostPrice > 0 ? ((formSellingPrice - formCostPrice) / formCostPrice) * 100 : 0;

    const rawImage = formImage.trim() || getSmartProductImage(formName.trim(), formCategory);
    const resolvedImage = await ensureImageAsBase64(rawImage);

    const payload: Omit<Product, 'id'> = {
      name: formName.trim(),
      category: formCategory,
      barcode: formBarcode.trim(),
      unit: formIsScaleItem ? 'kg' : formUnit,
      boxSize: formUnit === 'carton' || formUnit === 'box' ? formBoxSize : undefined,
      pieceCostPrice: (formUnit === 'carton' || formUnit === 'box') && useCustomPiecePrice ? formPieceCostPrice : undefined,
      pieceSellingPrice: (formUnit === 'carton' || formUnit === 'box') && useCustomPiecePrice ? formPieceSellingPrice : undefined,
      stockQuantity: formStockQuantity,
      minStockAlert: formMinStockAlert,
      costPrice: formCostPrice,
      sellingPrice: formSellingPrice,
      profitMargin: Math.round(profitMargin * 10) / 10,
      expiryDate: formExpiryDate || undefined,
      supplierId: formSupplierId,
      supplierName: sup?.name,
      isScaleItem: formIsScaleItem,
      image: resolvedImage,
      notes: formNotes.trim(),
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct?.id) {
      await db.products.update(editingProduct.id, payload);
    } else {
      const newId = await db.products.add(payload as Product);
      // Record initial movement
      await db.stockMovements.add({
        productId: newId,
        productName: payload.name,
        type: 'purchase',
        quantityChange: payload.stockQuantity,
        previousStock: 0,
        newStock: payload.stockQuantity,
        unit: payload.unit,
        date: new Date().toISOString().split('T')[0],
        reason: 'إضافة منتج جديد ورصيد افتتاحي',
        createdAt: new Date().toISOString(),
      });
    }

    setIsFormModalOpen(false);
    triggerRefresh();
  };

  // Save Stock Audit Adjustment
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditProduct?.id) return;

    const prev = auditProduct.stockQuantity;
    const diff = auditNewStock - prev;

    await db.products.update(auditProduct.id, {
      stockQuantity: auditNewStock,
      updatedAt: new Date().toISOString(),
    });

    await db.stockMovements.add({
      productId: auditProduct.id,
      productName: auditProduct.name,
      type: diff >= 0 ? 'adjustment' : 'loss',
      quantityChange: diff,
      previousStock: prev,
      newStock: auditNewStock,
      unit: auditProduct.unit,
      date: new Date().toISOString().split('T')[0],
      reason: auditReason || 'تعديل جرد المخزون',
      createdAt: new Date().toISOString(),
    });

    setIsAuditModalOpen(false);
    triggerRefresh();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      alert('لا توجد منتجات مسجلة للتصدير حالياً');
      return;
    }
    const headers = ['الاسم', 'الباركود', 'التصنيف', 'الوحدة', 'سعر الشراء', 'سعر البيع', 'الكمية', 'حد التنبيه', 'تاريخ الصلاحية'];
    const rows = products.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.barcode || ''}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${p.unit || 'piece'}"`,
      p.costPrice || 0,
      p.sellingPrice || 0,
      p.stockQuantity || 0,
      p.minStockAlert || 5,
      `"${p.expiryDate || ''}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `قائمة_منتجات_المحل_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import CSV Ref & Handler
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('الملف فارغ أو لا يحتوي على بيانات كافية');
          return;
        }

        const delimiter = lines[0].includes(';') ? ';' : ',';
        const newProducts: Product[] = [];

        for (let i = 1; i < lines.length; i++) {
          const raw = lines[i];
          const parts = raw.split(delimiter).map((col) => col.replace(/^"(.*)"$/, '$1').trim());
          if (parts.length >= 2 && parts[0]) {
            const name = parts[0];
            const barcode = parts[1] || generateBarcode();
            const category = parts[2] || (categories[0]?.name || 'مواد غذائية عامة وبقوليات');
            const unit = (parts[3] as UnitType) || 'piece';
            const costPrice = parseFloat(parts[4]) || 0;
            const sellingPrice = parseFloat(parts[5]) || Math.round(costPrice * 1.25);
            const stockQuantity = parseFloat(parts[6]) || 0;
            const minStockAlert = parseFloat(parts[7]) || 5;
            const expiryDate = parts[8] || undefined;
            const profitMargin = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;

            newProducts.push({
              name,
              barcode,
              category,
              unit,
              costPrice,
              sellingPrice,
              profitMargin: Math.round(profitMargin * 10) / 10,
              stockQuantity,
              minStockAlert,
              expiryDate,
              isScaleItem: unit === 'kg',
              image: getSmartProductImage(name, category),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        if (newProducts.length > 0) {
          await db.products.bulkPut(newProducts);
          triggerRefresh();
          alert(`تم استيراد ${newProducts.length} منتج بنجاح وتحديث قاعدة البيانات!`);
        } else {
          alert('لم يتم العثور على أسطر منتجات صالحة في الملف');
        }
      } catch (err) {
        console.error('Import CSV error:', err);
        alert('حدث خطأ أثناء معالجة ملف CSV');
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Delete Product
  const handleDeleteProduct = (id: number, name: string) => {
    setProductToDelete({ id, name });
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;
    await db.products.delete(productToDelete.id);
    setProductToDelete(null);
    triggerRefresh();
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return products.filter((p) => {
      const matchCat = selectedCategory === 'الكل' || p.category === selectedCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0;
      } else if (stockFilter === 'out') {
        matchStock = p.stockQuantity <= 0;
      } else if (stockFilter === 'scale') {
        matchStock = p.isScaleItem;
      } else if (stockFilter === 'expired') {
        matchStock = p.expiryDate ? new Date(p.expiryDate) < now : false;
      }

      return matchCat && matchSearch && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>إدارة المنتجات والمخزون والباركود</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md font-bold border border-gray-200">
              {products.length} منتج مسجل
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            تحديث الأسعار، جرد المخزون، تتبع حركات السلع، ومراقبة الصلاحية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            title="فتح مركز إدارة وقاعدة بيانات Excel الشاملة"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>مركز إدارة Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportProductsToExcel(products)}
            title="تصدير قائمة المنتجات الحالية إلى ملف Microsoft Excel (.xlsx)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold border border-gray-200 shadow-2xs transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>تصدير Excel (.xlsx)</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ إضافة منتج يدوي</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-gray-200 p-3.5 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الباركود، الصنف..."
              className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 pr-10 pl-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-xs font-medium"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Stock Health Filter Pills */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-bold overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'low', label: 'منخفض المخزون' },
              { id: 'out', label: 'النافد (0)' },
              { id: 'scale', label: 'بالميزان' },
              { id: 'expired', label: 'منتهي الصلاحية' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStockFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  stockFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar border-t border-gray-100">
          <button
            onClick={() => setSelectedCategory('الكل')}
            className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'الكل'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            جميع الأصناف
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c.name
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
              <tr>
                <th className="p-3">المنتج / الصنف</th>
                <th className="p-3">الباركود</th>
                <th className="p-3">المخزون الحالي</th>
                <th className="p-3">سعر الشراء</th>
                <th className="p-3">سعر البيع</th>
                <th className="p-3">هامش الربح</th>
                <th className="p-3">الصلاحية</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0;
                const isLow = p.stockQuantity <= p.minStockAlert && !isOutOfStock;
                const isExpired = p.expiryDate ? new Date(p.expiryDate) < new Date() : false;

                return (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Product Name & Category */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Product Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
                          <img
                            src={p.image || getSmartProductImage(p.name, p.category)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const smart = getSmartProductImage(p.name, p.category);
                              if (target.src !== smart) {
                                target.src = smart;
                              } else {
                                target.src = generateOfflineProductSvg(p.name, p.category);
                              }
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">{p.name}</p>
                            {p.isScaleItem && (
                              <span className="p-0.5 px-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold" title="يباع بالميزان">
                                ميزان ⚖️
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">{p.category}</p>
                        </div>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="p-3 font-mono text-gray-700 font-bold">{p.barcode}</td>

                    {/* Stock Quantity */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.stockQuantity} {p.unit}
                        {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      </span>
                    </td>

                    {/* Cost Price */}
                    <td className="p-3 text-gray-500">{formatCurrency(p.costPrice, currency)}</td>

                    {/* Selling Price */}
                    <td className="p-3 font-bold text-blue-600">{formatCurrency(p.sellingPrice, currency)}</td>

                    {/* Profit Margin */}
                    <td className="p-3 font-bold text-emerald-600">
                      +{p.profitMargin ? p.profitMargin.toFixed(1) : 0}%
                    </td>

                    {/* Expiry Date */}
                    <td className="p-3">
                      {p.expiryDate ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isExpired ? 'bg-red-50 text-red-600 border border-red-200' : 'text-gray-600'
                          }`}
                        >
                          {p.expiryDate}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openHistoryModal(p)}
                          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                          title="سجل حركة المنتج"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openAuditModal(p)}
                          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-amber-600 transition-colors"
                          title="جرد وتعديل المخزون"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                          title="تعديل المنتج"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id!, p.name)}
                          className="p-1.5 rounded-md bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    لا توجد منتجات مطابقة لخيارات البحث المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>{editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد إلى المحل'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Fields */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 mb-1 block">اسم المنتج التجاري *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleFormNameChange(e.target.value)}
                    placeholder="اكتب اسم المنتج (مثال: إفري 1.5 لتر، كوكاكولا، حليب كانديا، زيت عافية، بسكويت بيمو، قهوة...)"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 font-bold text-sm shadow-2xs"
                  />
                </div>

                {/* Product Image Card (Direct URL & Automatic Preview) */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>صورة المنتج (رابط مباشر وتحميل تلقائي 🖼️)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      محفوظة تلقائياً في قاعدة بيانات البرنامج 💾
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Live Image Preview Container */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative group">
                      {formImage ? (
                        <img
                          src={formImage}
                          alt={formName || 'معاينة الصورة'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = generateOfflineProductSvg(formName || 'منتج', formCategory);
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 text-center p-1">
                          <ImageIcon className="w-7 h-7 mb-1 stroke-1" />
                          <span className="text-[9px] font-bold">بدون صورة</span>
                        </div>
                      )}
                    </div>

                    {/* URL Input & Quick Actions */}
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-xs font-bold text-gray-800 block">رابط صورة المنتج (URL):</label>
                      <input
                        type="text"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="الصق رابط الصورة المباشر هنا (https://example.com/image.jpg)..."
                        className="w-full bg-white border border-gray-300 text-gray-900 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
                      />
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFormImage(generateOfflineProductSvg(formName || 'منتج', formCategory))}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md font-bold transition-all active:scale-95"
                          title="توليد شارة متجهة مخصصة بدون إنترنت"
                        >
                          🎨 شارة رمزية تلقائية
                        </button>
                        {formImage && (
                          <button
                            type="button"
                            onClick={() => setFormImage('')}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold transition-all active:scale-95"
                          >
                            ✕ مسح الرابط
                          </button>
                        )}
                        <span className="text-gray-500 text-[10px]">تُحمل الصورة فوراً وتُحفظ دائماً مع المنتج</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">الصنف / الفئة *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleFormCategoryChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barcode with Generator */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 flex justify-between items-center">
                    <span>رمز الباركود (Barcode) *</span>
                    <button
                      type="button"
                      onClick={() => setFormBarcode(generateBarcode())}
                      className="text-blue-600 text-[11px] hover:underline"
                    >
                      توليد تلقائي
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="613..."
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-mono font-bold rounded-lg pr-3 pl-8 py-2 focus:outline-none focus:border-blue-500"
                    />
                    <Barcode className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Unit & Scale Mode Toggle */}
                <div className="sm:col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">البيع بالميزان (بالوزن: كغ / غرام)</p>
                    <p className="text-[11px] text-gray-500">
                      تفعيل هذا الخيار للخضار والفواكه والأجبان الموزونة عند الكاشير
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsScaleItem}
                      onChange={(e) => setFormIsScaleItem(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Unit selector if not scale item */}
                {!formIsScaleItem && (
                  <div>
                    <label className="font-bold text-gray-700 mb-1 block">وحدة البيع *</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value as UnitType)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      <option value="piece">قطعة فردية (Piece)</option>
                      <option value="pack">علبة / باكي (Pack)</option>
                      <option value="box">صندوق / كرتون (Box/Carton)</option>
                      <option value="carton">كرتونة / طبق (Carton)</option>
                      <option value="liter">لتر (Liter)</option>
                      <option value="kg">كيلوغرام (Kg)</option>
                      <option value="g">غرام (Gram)</option>
                    </select>
                  </div>
                )}

                {/* Carton / Box Size & Unit Price Calculation */}
                {(formUnit === 'carton' || formUnit === 'box') && (
                  <div className="sm:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-blue-900 text-xs">📦 إعدادات الكرتونة وثمن الوحدة الفردية (الحبة)</p>
                        <p className="text-[11px] text-blue-700">حدد عدد الحبات في الكرتونة ويمكنك تفعيل التعديل اليدوي لسعر الحبة</p>
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-bold text-blue-800 block mb-1">عدد الحبات في الكرتونة:</label>
                        <input
                          type="number"
                          min="1"
                          value={formBoxSize}
                          onChange={(e) => setFormBoxSize(parseInt(e.target.value) || 30)}
                          className="w-full bg-white border border-blue-300 text-blue-900 font-mono font-bold rounded-lg px-2.5 py-1 text-center text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <span className="text-xs font-bold text-blue-900">تعديل سعر بيع وشراء الحبة يدوياً؟</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useCustomPiecePrice}
                          onChange={(e) => {
                            setUseCustomPiecePrice(e.target.checked);
                            if (e.target.checked && formPieceSellingPrice === 0) {
                              setFormPieceSellingPrice(Math.round((formSellingPrice / formBoxSize) * 100) / 100);
                              setFormPieceCostPrice(Math.round((formCostPrice / formBoxSize) * 100) / 100);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {useCustomPiecePrice ? (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-1">سعر شراء الحبة (يدوي):</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formPieceCostPrice}
                            onChange={(e) => setFormPieceCostPrice(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-300 text-gray-900 font-mono font-bold rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-emerald-700 block mb-1">سعر بيع الحبة (يدوي):</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={formPieceSellingPrice}
                            onChange={(e) => setFormPieceSellingPrice(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-emerald-300 text-emerald-800 font-mono font-black rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                          <span className="text-gray-500 block text-[10px]">🛒 ثمن شراء الحبة (تلقائي):</span>
                          <span className="font-mono font-bold text-gray-900 text-sm">
                            {formatCurrency(formBoxSize > 0 ? formCostPrice / formBoxSize : 0, currency)}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                          <span className="text-emerald-700 block text-[10px]">🏷️ ثمن بيع الحبة (تلقائي):</span>
                          <span className="font-mono font-black text-emerald-800 text-sm">
                            {formatCurrency(formBoxSize > 0 ? formSellingPrice / formBoxSize : 0, currency)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Initial Stock Quantity */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">
                    كمية المخزون {formIsScaleItem ? '(بالكيلوغرام)' : ''} *
                  </label>
                  <input
                    type="number"
                    step={formIsScaleItem ? '0.1' : '1'}
                    min="0"
                    required
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Min Stock Alert Threshold */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">حد التنبيه عند انخفاض المخزون *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">
                    سعر الشراء والتكلفة ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">سعر البيع للزبون ({currency}) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-200 text-blue-600 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Auto Calculated Profit Margin */}
                <div className="sm:col-span-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-gray-600">هامش الربح الصافي المحسوب تلقائياً:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    +{formCostPrice > 0 ? (((formSellingPrice - formCostPrice) / formCostPrice) * 100).toFixed(1) : 0}%
                    ({formatCurrency(formSellingPrice - formCostPrice, currency)} ربح للوحدة)
                  </span>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">تاريخ انتهاء الصلاحية (اختياري):</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">المورد الافتراضي:</label>
                  <select
                    value={formSupplierId || ''}
                    onChange={(e) => setFormSupplierId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">بدون مورد محدد</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 mb-1 block">ملاحظات إضافية:</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="موقع الرف، مواصفات خاصة..."
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
              >
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STOCK AUDIT / INVENTORY ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {isAuditModalOpen && auditProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAudit}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">جرد وتعديل مخزون: {auditProduct.name}</h3>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>الكمية المسجلة حالياً:</span>
                  <span className="font-bold text-gray-900">
                    {auditProduct.stockQuantity} {auditProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">الكمية الفعلية بعد الجرد *</label>
                <input
                  type="number"
                  step={auditProduct.isScaleItem ? '0.1' : '1'}
                  required
                  value={auditNewStock}
                  onChange={(e) => setAuditNewStock(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 text-blue-600 font-mono text-lg font-bold rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">سبب التعديل / الجرد:</label>
                <select
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="جرد فعلي للمخزن وتصحيح الفارق">جرد فعلي للمخزن وتصحيح الفارق</option>
                  <option value="بضاعة تالفة / مكسورة">بضاعة تالفة / مكسورة</option>
                  <option value="انتهاء صلاحية وسحب من الرف">انتهاء صلاحية وسحب من الرف</option>
                  <option value="عينة تذوق أو استهلاك المحل">عينة تذوق أو استهلاك المحل</option>
                  <option value="هدية أو زيادة من المورد">هدية أو زيادة من المورد</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
              >
                تأكيد وتحديث المخزون
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRODUCT MOVEMENT HISTORY LEDGER MODAL */}
      {/* ========================================================================= */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in max-h-[85vh] flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">سجل حركة وتتبع المنتج: {historyProduct.name}</h3>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-2">
                {productMovements.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            m.type === 'sale'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : m.type === 'purchase'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {m.type === 'sale'
                            ? 'مبيعات'
                            : m.type === 'purchase'
                            ? 'شراء توريد'
                            : m.type === 'loss'
                            ? 'إتلاف/نقص'
                            : 'تعديل جرد'}
                        </span>
                        <span className="font-bold text-gray-800">{m.reason}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        التاريخ: {m.date} | المرجع: {m.referenceId || '-'}
                      </p>
                    </div>

                    <div className="text-left">
                      <p
                        className={`text-sm font-mono font-extrabold ${
                          m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange} {m.unit}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        الرصيد بعد الحركة: {m.newStock} {m.unit}
                      </p>
                    </div>
                  </div>
                ))}

                {productMovements.length === 0 && (
                  <p className="text-center py-8 text-gray-400">لا توجد حركات مسجلة لهذا المنتج بعد</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 text-left">
              <button
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 text-right">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">تأكيد حذف السلعة</h3>
                <p className="text-[11px] text-gray-500">سيتم حذف هذا الصنف نهائياً من قاعدة البيانات</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
              هل أنت متأكد من رغبتك في حذف المنتج:{' '}
              <span className="font-bold text-red-700 block mt-1">"{productToDelete.name}"</span>
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDeleteProduct}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                نعم، احذف المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
