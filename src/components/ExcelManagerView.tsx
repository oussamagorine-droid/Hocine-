import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Settings2,
  Layers,
  ArrowRight,
  Database,
  Search,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, UnitType } from '../types';
import {
  parseExcelFile,
  guessColumnMapping,
  ExcelColumnMapping,
  generateStoreTemplateExcel,
  exportProductsToExcel,
  exportCompleteStoreToExcel,
  ParsedExcelRow,
} from '../utils/excelUtils';

export const ExcelManagerView: React.FC = () => {
  const { triggerRefresh, playSuccessSound } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetsData, setSheetsData] = useState<Record<string, ParsedExcelRow[]>>({});
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ExcelColumnMapping>({
    name: '',
    barcode: '',
    category: '',
    unit: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: '',
    expiryDate: '',
  });

  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing products count
  useEffect(() => {
    async function loadStats() {
      const allProducts = await db.products.toArray();
      setProducts(allProducts);
    }
    loadStats();
  }, []);

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const result = await parseExcelFile(selectedFile);
      setFile(selectedFile);
      setSheetNames(result.sheetNames);
      setSheetsData(result.sheetsData);

      const firstSheet = result.sheetNames[0] || '';
      setActiveSheet(firstSheet);

      const rows = result.sheetsData[firstSheet] || [];
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        setAvailableHeaders(headers);
        const guessed = guessColumnMapping(headers);
        setMapping(guessed);
      } else {
        setAvailableHeaders([]);
      }

      setStatusMessage({
        type: 'info',
        text: `تم تحميل ملف "${selectedFile.name}" بنجاح. يحتوي على ${rows.length} صف في ورقة العمل الأولى.`,
      });
    } catch (err) {
      console.error('Error parsing excel:', err);
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من أن الملف بصيغة .xlsx أو .xls صالحة.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch Sheet
  const handleSheetChange = (sheetName: string) => {
    setActiveSheet(sheetName);
    const rows = sheetsData[sheetName] || [];
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      setAvailableHeaders(headers);
      const guessed = guessColumnMapping(headers);
      setMapping(guessed);
    } else {
      setAvailableHeaders([]);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!file || !activeSheet) {
      setStatusMessage({ type: 'error', text: 'يرجى اختيار أو رفع ملف إكسل أولاً' });
      return;
    }

    if (!mapping.name) {
      setStatusMessage({ type: 'error', text: 'يرجى تحديد عمود "اسم المنتج" على الأقل لإتمام الاستيراد' });
      return;
    }

    const rows = sheetsData[activeSheet] || [];
    if (rows.length === 0) {
      setStatusMessage({ type: 'error', text: 'ورقة العمل المختارة لا تحتوي على أي صفوف من البيانات' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const existingProducts = await db.products.toArray();
      const existingByBarcode = new Map<string, Product>();
      const existingByName = new Map<string, Product>();

      existingProducts.forEach((p) => {
        if (p.barcode) existingByBarcode.set(p.barcode.trim(), p);
        if (p.name) existingByName.set(p.name.trim().toLowerCase(), p);
      });

      const now = new Date().toISOString();
      const toInsertOrUpdate: Product[] = [];
      let addedCount = 0;
      let updatedCount = 0;

      rows.forEach((row, index) => {
        const rawName = String(row[mapping.name] || '').trim();
        if (!rawName) return; // Skip empty rows

        let barcode = mapping.barcode ? String(row[mapping.barcode] || '').trim() : '';
        if (!barcode) {
          barcode = `GEN-${Date.now().toString().slice(-6)}${index + 1}`;
        }

        const category = mapping.category ? String(row[mapping.category] || '').trim() : 'مواد غذائية عامة وبقوليات';
        const rawUnit = mapping.unit ? String(row[mapping.unit] || '').trim().toLowerCase() : 'piece';
        const unit: UnitType = ['kg', 'g', 'liter', 'box', 'carton', 'pack'].includes(rawUnit)
          ? (rawUnit as UnitType)
          : rawUnit.includes('كغ') || rawUnit.includes('كيلو') || rawUnit.includes('kg')
          ? 'kg'
          : 'piece';

        const costPrice = mapping.costPrice ? parseFloat(String(row[mapping.costPrice]).replace(/[^0-9.]/g, '')) || 0 : 0;
        let sellingPrice = mapping.sellingPrice ? parseFloat(String(row[mapping.sellingPrice]).replace(/[^0-9.]/g, '')) || 0 : 0;
        if (sellingPrice === 0 && costPrice > 0) {
          sellingPrice = Math.round(costPrice * 1.25);
        }

        const stockQuantity = mapping.stockQuantity ? parseFloat(String(row[mapping.stockQuantity]).replace(/[^0-9.]/g, '')) || 0 : 0;
        const minStockAlert = mapping.minStockAlert ? parseFloat(String(row[mapping.minStockAlert]).replace(/[^0-9.]/g, '')) || 5 : 5;
        const expiryDate = mapping.expiryDate ? String(row[mapping.expiryDate] || '').trim() : undefined;

        const profitMargin = costPrice > 0 ? ((sellingPrice - costPrice) / costPrice) * 100 : 0;

        // Check match
        const existing = importMode === 'merge' ? existingByBarcode.get(barcode) || existingByName.get(rawName.toLowerCase()) : null;

        if (existing && existing.id) {
          toInsertOrUpdate.push({
            ...existing,
            name: rawName,
            barcode,
            category: category || existing.category,
            unit: unit || existing.unit,
            costPrice: costPrice > 0 ? costPrice : existing.costPrice,
            sellingPrice: sellingPrice > 0 ? sellingPrice : existing.sellingPrice,
            stockQuantity: mapping.stockQuantity ? stockQuantity : existing.stockQuantity,
            profitMargin: Math.round(profitMargin * 10) / 10,
            minStockAlert,
            expiryDate: expiryDate || existing.expiryDate,
            updatedAt: now,
          });
          updatedCount++;
        } else {
          toInsertOrUpdate.push({
            name: rawName,
            barcode,
            category: category || 'مواد غذائية عامة وبقوليات',
            unit,
            costPrice,
            sellingPrice,
            profitMargin: Math.round(profitMargin * 10) / 10,
            stockQuantity,
            minStockAlert,
            expiryDate: expiryDate || undefined,
            isScaleItem: unit === 'kg' || unit === 'g',
            createdAt: now,
            updatedAt: now,
          });
          addedCount++;
        }
      });

      if (importMode === 'replace') {
        await db.products.clear();
      }

      await db.products.bulkPut(toInsertOrUpdate);

      // Refresh state
      const updatedProducts = await db.products.toArray();
      setProducts(updatedProducts);
      triggerRefresh();
      playSuccessSound();

      setStatusMessage({
        type: 'success',
        text: `تم استيراد ومعالجة ملف الإكسل بنجاح! (تمت إضافة ${addedCount} منتج جديد، وتحديث ${updatedCount} منتج مسجل مسبقاً). إجمالي المنتجات الآن: ${updatedProducts.length}`,
      });
    } catch (err) {
      console.error('Import error:', err);
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء إدخال البيانات في قاعدة البيانات. يرجى التحقق من صياغة الحقول الرقمية في الملف.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export handlers
  const handleExportProducts = async () => {
    const all = await db.products.toArray();
    if (all.length === 0) {
      setStatusMessage({ type: 'info', text: 'لا توجد منتجات مسجلة في قاعدة البيانات لتصديرها حالياً.' });
      return;
    }
    exportProductsToExcel(all);
    playSuccessSound();
  };

  const handleExportFullStore = async () => {
    const [allProducts, allSales, allCustomers, allSuppliers] = await Promise.all([
      db.products.toArray(),
      db.sales.toArray(),
      db.customers.toArray(),
      db.suppliers.toArray(),
    ]);

    exportCompleteStoreToExcel(allProducts, allSales, allCustomers, allSuppliers);
    playSuccessSound();
  };

  const activeRows = sheetsData[activeSheet] || [];
  const filteredRows = activeRows.filter((r) => {
    if (!previewSearch) return true;
    return Object.values(r).some((v) => String(v).toLowerCase().includes(previewSearch.toLowerCase()));
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto p-4 md:p-6 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">مركز إدارة وتكامل قواعد بيانات Excel</h1>
            <p className="text-xs text-gray-500">
              استيراد وتصدير ومزامنة المخزون والأسعار والتقارير مباشرة عبر ملفات Microsoft Excel (.xlsx / .xls)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={generateStoreTemplateExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs shadow-2xs transition-all active:scale-95"
            title="تحميل نموذج جاهز ومنسق لإدخال بضائع البقالة في برنامج Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تحميل نموذج إكسل جاهز للبقالة (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportProducts}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold text-xs shadow-2xs transition-all active:scale-95"
            title="تصدير قائمة المنتجات الحالية إلى ملف إكسل منسق"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>تصدير المنتجات الحالية (Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleExportFullStore}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            title="تصدير نسخة إكسل شاملة تحتوي على المنتجات، المبيعات، الزبائن والديون في أوراق متعددة"
          >
            <Database className="w-4 h-4" />
            <span>تصدير قاعدة بيانات المتجر كاملة (Excel شامل)</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`mt-4 p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          ) : (
            <FileCheck className="w-5 h-5 shrink-0 text-blue-600" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-gray-600 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Upload & Column Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Step 1: Upload Box (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold text-gray-800">اختيار أو إفلات ملف Excel</h2>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-all bg-gray-50 hover:bg-emerald-50/40 group"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-800 mb-1">
                {file ? file.name : 'اضغط هنا أو اسحب ملف Excel (.xlsx أو .xls)'}
              </p>
              <p className="text-[11px] text-gray-400">يدعم ملفات Microsoft Excel من 2007 إلى 2026</p>
            </div>

            {file && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>حجم الملف:</span>
                  <span className="font-mono font-bold">{(file.size / 1024).toFixed(1)} كيلوبايت</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>أوراق العمل (Sheets):</span>
                  <span className="font-bold text-emerald-700">{sheetNames.length} ورقة</span>
                </div>

                {sheetNames.length > 1 && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">اختر ورقة العمل المراد قراءتها:</label>
                    <select
                      value={activeSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-800 outline-hidden focus:border-emerald-500"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          ورقة: {s} ({sheetsData[s]?.length || 0} صف)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border border-emerald-100 p-4 text-xs text-gray-700 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>كيف ترتب ملف الإكسل؟</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600 pr-1">
              <li>يكفي أن يحتوي ملف الإكسل على عمود لاسم المنتج وعمود للسعر.</li>
              <li>إذا لم يتوفر باركود، سيقوم البرنامج بتوليد باركود تلقائي لكل منتج.</li>
              <li>يمكنك تحميل النموذج الجاهز وتعديله على برنامج Excel ثم رفعه هنا بنقرة زر.</li>
            </ul>
          </div>
        </div>

        {/* Step 2: Column Mapping Box (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-gray-800">مطابقة وتعيين أعمدة ملف Excel</h2>
              </div>
              <span className="text-[11px] text-gray-500">
                البرنامج يتعرف على الأعمدة تلقائياً ويمكنك تعديلها يدوياً
              </span>
            </div>

            {availableHeaders.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
                يرجى رفع ملف Excel في الخطوة الأولى لعرض ومطابقة الأعمدة هنا
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Name (Required) */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      اسم المنتج <span className="text-red-500">* (إجباري)</span>
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-bold text-emerald-800"
                    >
                      <option value="">-- اختر عمود الاسم --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barcode */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      الباركود (Barcode)
                    </label>
                    <select
                      value={mapping.barcode}
                      onChange={(e) => setMapping({ ...mapping, barcode: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- توليد باركود تلقائي إن لم يتوفر --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selling Price */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      سعر البيع للزبون (د.ج)
                    </label>
                    <select
                      value={mapping.sellingPrice}
                      onChange={(e) => setMapping({ ...mapping, sellingPrice: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-bold text-blue-700"
                    >
                      <option value="">-- اختر عمود سعر البيع --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Price */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      سعر الشراء / التكلفة (د.ج)
                    </label>
                    <select
                      value={mapping.costPrice}
                      onChange={(e) => setMapping({ ...mapping, costPrice: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- اختياري (صفر إذا لم يتوفر) --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stock Quantity */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      الكمية / المخزون
                    </label>
                    <select
                      value={mapping.stockQuantity}
                      onChange={(e) => setMapping({ ...mapping, stockQuantity: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- اختياري (0 افتراضياً) --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      التصنيف / الفئة
                    </label>
                    <select
                      value={mapping.category}
                      onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- تصنيف عام افتراضي --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      الوحدة (قطعة / كغ / لتر)
                    </label>
                    <select
                      value={mapping.unit}
                      onChange={(e) => setMapping({ ...mapping, unit: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- قطعة (Piece) افتراضياً --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      تاريخ انتهاء الصلاحية
                    </label>
                    <select
                      value={mapping.expiryDate}
                      onChange={(e) => setMapping({ ...mapping, expiryDate: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- اختياري --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min Alert */}
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="block text-[11px] font-bold text-gray-800 mb-1">
                      حد إنذار نقص المخزون
                    </label>
                    <select
                      value={mapping.minStockAlert}
                      onChange={(e) => setMapping({ ...mapping, minStockAlert: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs text-gray-800"
                    >
                      <option value="">-- 5 قطع افتراضياً --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Import Mode Options */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-800">طريقة تحديث قاعدة البيانات:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-gray-800">دمج وتحديث الأسعار والمخزون</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="font-bold text-red-700">استبدال كامل المخزون (بدء جديد)</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={isProcessing || !mapping.name}
                    onClick={handleExecuteImport}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري معالجة الإكسل...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد واستيراد {activeRows.length} منتج إلى المتجر</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Live Preview Table */}
      {availableHeaders.length > 0 && (
        <div className="mt-5 bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-800">
                معاينة محتويات ورقة العمل ({filteredRows.length} صف معروض)
              </h3>
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                placeholder="بحث داخل صفوف الإكسل..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-8 pl-3 py-1.5 text-xs text-gray-800 outline-hidden focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 border border-gray-100 rounded-lg">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="p-2.5 text-center w-12 text-gray-400">#</th>
                  {availableHeaders.map((header) => {
                    const isMapped = Object.values(mapping).includes(header);
                    return (
                      <th
                        key={header}
                        className={`p-2.5 whitespace-nowrap ${
                          isMapped ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          {isMapped && <span className="text-[10px] text-emerald-600 font-mono">✓</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-sans">
                {filteredRows.slice(0, 100).map((row, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-2 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                    {availableHeaders.map((header) => (
                      <td key={header} className="p-2 whitespace-nowrap text-xs">
                        {String(row[header] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 100 && (
            <p className="mt-2 text-[11px] text-gray-400 text-center">
              يتم عرض أول 100 صف كمعاينة سريعة فقط. سيتم استيراد كافة الصفوف ({filteredRows.length} صف) بالكامل عند الضغط على الاستيراد.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
