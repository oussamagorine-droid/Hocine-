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
} from '../utils/productImageUtils';
import { searchProductImagesOnline, searchSmartProductsOnline, WebImageResult } from '../utils/onlineImageSearch';
import { ImagePickerModal } from './ImagePickerModal';
import { SmartProductSearchModal } from './SmartProductSearchModal';

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

  // Smart Search Modal State
  const [isSmartSearchModalOpen, setIsSmartSearchModalOpen] = useState<boolean>(false);
  const [isAutoFillingGoogle, setIsAutoFillingGoogle] = useState<boolean>(false);

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
  const [formImage, setFormImage] = useState<string>('');
  const [onlineImageResults, setOnlineImageResults] = useState<WebImageResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [isImagePickerModalOpen, setIsImagePickerModalOpen] = useState<boolean>(false);

  // Auto-fill form fields using Google Smart Product Search
  const handleAutoFillWithGoogle = async () => {
    const q = formName.trim();
    if (!q || q.length < 2) {
      alert('يرجى كتابة اسم المنتج أولاً للبحث التلقائي في Google');
      return;
    }

    setIsAutoFillingGoogle(true);
    try {
      const response = await searchSmartProductsOnline(q);
      if (response.results && response.results.length > 0) {
        const best = response.results[0];
        setFormName(best.name);
        if (best.category) setFormCategory(best.category);
        if (best.barcode) setFormBarcode(best.barcode);
        if (best.unit) setFormUnit(best.unit as UnitType);
        if (best.costPrice) setFormCostPrice(best.costPrice);
        if (best.sellingPrice) setFormSellingPrice(best.sellingPrice);
        if (best.imageUrl) setFormImage(best.imageUrl);
        if (best.isScaleItem !== undefined) setFormIsScaleItem(best.isScaleItem);
        if (best.description) setFormNotes(best.description);

        // Also fetch images list
        const imgs = await searchProductImagesOnline(best.name, best.category);
        setOnlineImageResults(imgs);
      } else if (response.warning) {
        alert(response.warning);
      } else {
        alert(`لم يتم العثور على معلومات دقيقة لـ "${q}"، يمكنك إدخال البيانات يدوياً`);
      }
    } catch (err) {
      console.error('Auto fill error:', err);
    } finally {
      setIsAutoFillingGoogle(false);
    }
  };

  // Search internet for product images when typing name (with debounce)
  useEffect(() => {
    if (!isFormModalOpen) return;
    const q = formName.trim();
    if (!q || q.length < 2) {
      setOnlineImageResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchProductImagesOnline(q, formCategory);
        setOnlineImageResults(results);
        // Automatically select the first internet search result if image isn't explicitly customized
        if (results.length > 0 && (!formImage || formImage.startsWith('data:image/svg') || !editingProduct)) {
          setFormImage(results[0].url);
        }
      } catch (e) {
        console.error('Online image search error:', e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formName, formCategory, isFormModalOpen]);

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
    setFormStockQuantity(10);
    setFormMinStockAlert(5);
    setFormCostPrice(100);
    setFormSellingPrice(130);
    setFormExpiryDate('');
    setFormSupplierId(suppliers[0]?.id);
    setFormIsScaleItem(false);
    setFormNotes('');
    setFormImage('');
    setOnlineImageResults([]);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormBarcode(p.barcode);
    setFormUnit(p.unit);
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
    setOnlineImageResults([]);
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

    const resolvedImage = formImage.trim() || getSmartProductImage(formName.trim(), formCategory);

    const payload: Omit<Product, 'id'> = {
      name: formName.trim(),
      category: formCategory,
      barcode: formBarcode.trim(),
      unit: formIsScaleItem ? 'kg' : formUnit,
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
          {/* Smart Google Product Search Button */}
          <button
            type="button"
            onClick={() => setIsSmartSearchModalOpen(true)}
            title="البحث الذكي في سلع السوبرماركت الجزائرية عبر Google Search API"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <div className="flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-blue-300 inline-block"></span>
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
              <span className="w-2 h-2 rounded-full bg-amber-300 inline-block"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            </div>
            <span>البحث الذكي في سلع السوبرماركت (Google 🇩🇿)</span>
          </button>

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
                              (e.target as HTMLImageElement).src = generateOfflineProductSvg(p.name, p.category);
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 block">اسم المنتج *</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoFillWithGoogle}
                        disabled={isAutoFillingGoogle || !formName.trim()}
                        className="text-[11px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                        title="البحث الذكي وتعبئة الباركود، الصنف، السعر والصورة تلقائياً من Google"
                      >
                        {isAutoFillingGoogle ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-300" />
                        )}
                        <span>تعبئة ذكية وتلقائية عبر Google ⚡</span>
                      </button>
                      <span className="text-[11px] text-blue-600 font-bold hidden sm:flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Search API 🌐</span>
                      </span>
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => handleFormNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Force immediate internet search
                          if (formName.trim().length >= 2) {
                            setIsSearchingOnline(true);
                            searchProductImagesOnline(formName.trim(), formCategory).then((res) => {
                              setOnlineImageResults(res);
                              setIsSearchingOnline(false);
                            });
                          }
                        }
                      }}
                      placeholder="اكتب اسم المنتج (مثال: إفري 1.5 لتر، كوكاكولا، حليب كانديا، زيت عافية، بسكويت بيمو، قهوة...)"
                      className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg pr-3 pl-32 py-2.5 focus:outline-none focus:border-blue-500 font-bold text-sm shadow-2xs"
                    />
                    <div className="absolute left-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (formName.trim().length >= 2) {
                            setIsSearchingOnline(true);
                            searchProductImagesOnline(formName.trim(), formCategory).then((res) => {
                              setOnlineImageResults(res);
                              setIsSearchingOnline(false);
                            });
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                        title="بحث مباشر في صور Google عن هذا المنتج"
                      >
                        {isSearchingOnline ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          </div>
                        )}
                        <span>صور Google</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Smart Image Internet Search / Selection Panel */}
                <div className="sm:col-span-2 p-3.5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-200/80 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs">
                      <div className="flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </div>
                      <span>صور Google للمنتجات الجزائرية (أغذية وسوبرماركت)</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsImagePickerModalOpen(true)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg shadow-2xs transition-all active:scale-95"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>فتح بحث صور Google المباشر 🇩🇿</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Selected Image Preview & Visual Grid of Internet Results */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {isSearchingOnline ? (
                              <span className="flex items-center gap-1 text-blue-600 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                جارٍ البحث في صور Google عن سلع "{formName}" بالجزائر...
                              </span>
                            ) : onlineImageResults.length > 0 ? (
                              <span>نتائج صور Google لسلع "{formName}" ({onlineImageResults.length}):</span>
                            ) : (
                              <span>صور المنتجات المستخرجة من Google Images:</span>
                            )}
                          </span>
                        </span>
                        {onlineImageResults.length > 0 && (
                          <span className="text-[10px] text-blue-600 font-medium">
                            انقر على أي صورة لتحديدها للمنتج
                          </span>
                        )}
                      </div>

                      {/* Online Results Stream */}
                      {isSearchingOnline ? (
                        <div className="p-4 bg-white/70 rounded-xl border border-blue-100 flex items-center justify-center gap-2 text-blue-600 text-xs font-bold animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارٍ البحث المباشر في صور Google وقواعد البيانات الجزائرية عن "{formName}"...</span>
                        </div>
                      ) : onlineImageResults.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {onlineImageResults.map((res) => {
                            const isCurrent = formImage === res.url;
                            return (
                              <div
                                key={res.id}
                                onClick={() => setFormImage(res.url)}
                                className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer bg-white transition-all hover:shadow-md hover:scale-[1.02] flex flex-col ${
                                  isCurrent
                                    ? 'border-blue-600 ring-2 ring-blue-400/40 shadow-sm'
                                    : 'border-gray-200 hover:border-blue-400'
                                }`}
                              >
                                <div className="relative w-full h-20 sm:h-24 bg-white flex items-center justify-center p-1 border-b border-gray-100 overflow-hidden">
                                  <img
                                    src={res.thumbnailUrl || res.url}
                                    alt={res.title}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = generateOfflineProductSvg(res.title, formCategory);
                                    }}
                                  />
                                  <span className="absolute top-1 right-1 text-[8px] bg-black/75 text-white px-1 py-0.5 rounded-xs">
                                    {res.sourceName || 'Google Images 🇩🇿'}
                                  </span>
                                  {isCurrent && (
                                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                      <Check className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-1.5 text-right bg-white flex-1 flex flex-col justify-between">
                                  <p className="font-bold text-[10px] text-gray-800 line-clamp-1 leading-tight group-hover:text-blue-600">
                                    {res.title}
                                  </p>
                                  <span className={`text-[9px] font-bold mt-0.5 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {isCurrent ? '✓ محددة' : 'اختيار الصورة'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Offline SVG Vector Card Option */}
                          <div
                            onClick={() => setFormImage(generateOfflineProductSvg(formName || 'منتج', formCategory))}
                            className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer bg-white transition-all hover:shadow-md hover:scale-[1.02] flex flex-col ${
                              formImage.startsWith('data:image/svg')
                                ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                                : 'border-gray-200 hover:border-amber-400'
                            }`}
                          >
                            <div className="relative w-full h-20 sm:h-24 bg-amber-50 flex items-center justify-center overflow-hidden">
                              <span className="text-2xl">🎨</span>
                              {formImage.startsWith('data:image/svg') && (
                                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <div className="p-1.5 text-right bg-white flex-1 flex flex-col justify-between">
                              <p className="font-bold text-[10px] text-gray-800 line-clamp-1 leading-tight">
                                شارة بدون إنترنت
                              </p>
                              <span className="text-[9px] text-amber-600 font-bold mt-0.5">
                                {formImage.startsWith('data:image/svg') ? '✓ محددة' : 'شارة رمزية'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-xl border border-dashed border-gray-300 text-center space-y-1">
                          <p className="text-xs text-gray-600 font-bold">
                            {formName.trim().length >= 2
                              ? `اضغط زر "صور Google" أعلاه لجلب صور "${formName}" من الإنترنت فوراً`
                              : 'اكتب اسم المنتج ثم اضغط زر "صور Google" لجلب صوره الحقيقية من الإنترنت'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            بحث ذكي في صور Google مخصص للسوبرماركت والسلع الجزائرية مع استبعاد أي عقارات أو عناصر غير غذائية
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Custom URL or direct paste input */}
                    <div className="pt-1.5 border-t border-blue-100 flex items-center gap-2">
                      <input
                        type="text"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="أو الصق رابط صورة مخصص (URL) من الويب..."
                        className="flex-1 bg-white border border-gray-300 text-gray-800 text-[11px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsImagePickerModalOpen(true)}
                        className="flex items-center gap-1 shrink-0 text-[11px] font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>البحث في الإنترنت 🌐</span>
                      </button>
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
                      <option value="liter">لتر (Liter)</option>
                      <option value="kg">كيلوغرام (Kg)</option>
                      <option value="g">غرام (Gram)</option>
                    </select>
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
      {/* Full Image Gallery Picker Modal */}
      <ImagePickerModal
        isOpen={isImagePickerModalOpen}
        onClose={() => setIsImagePickerModalOpen(false)}
        productName={formName}
        category={formCategory}
        currentImage={formImage}
        onSelectImage={(url) => {
          setFormImage(url);
          setIsImagePickerModalOpen(false);
        }}
      />

      {/* Smart Product Search Modal via Google Search API */}
      <SmartProductSearchModal
        isOpen={isSmartSearchModalOpen}
        onClose={() => setIsSmartSearchModalOpen(false)}
        onProductAdded={(newProduct) => {
          // Trigger refresh is already called inside modal
        }}
      />
    </div>
  );
};
