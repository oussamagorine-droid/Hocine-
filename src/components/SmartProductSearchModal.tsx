import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Check,
  Sparkles,
  Globe,
  Loader2,
  PackagePlus,
  AlertTriangle,
  Barcode,
  Layers,
  CheckCircle2,
  TrendingUp,
  Tag,
  Store,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, UnitType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateOfflineProductSvg } from '../utils/productImageUtils';
import {
  searchSmartProductsOnline,
  SmartProductResult,
  isMedicationQuery,
} from '../utils/onlineImageSearch';

interface SmartProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: (product: Product) => void;
}

export const SmartProductSearchModal: React.FC<SmartProductSearchModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
}) => {
  const { settings, triggerRefresh, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<SmartProductResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [medicationWarning, setMedicationWarning] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Per-item customizable values before adding
  const [customQtys, setCustomQtys] = useState<Record<string, number>>({});
  const [customCostPrices, setCustomCostPrices] = useState<Record<string, number>>({});
  const [customSellingPrices, setCustomSellingPrices] = useState<Record<string, number>>({});
  const [selectedImageIndices, setSelectedImageIndices] = useState<Record<string, number>>({});
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [isAddingBulk, setIsAddingBulk] = useState<boolean>(false);

  // Popular Algerian grocery quick tags
  const popularAlgerianGroceries = [
    'ماء إفري 1.5 لتر',
    'حليب كانديا فيفا',
    'حمود بوعلام سيلكتو',
    'زيت إيليو 5 لتر',
    'طماطم مصبرة عمور',
    'سميد سيم 1 كغ',
    'شوكولا المرجان',
    'بسكويت بيمو تانغو',
    'جبن بربر أحمر',
    'سائل إيزيس 1 لتر',
    'قهوة بونال 250غ',
    'شامبو فينوس',
    'تونة ماراتون',
    'عصير رامي فواكه',
    'ياغورت صومام',
  ];

  // Perform Smart Search via Google Search API
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setMedicationWarning(null);
      setIsLoading(false);
      return;
    }

    if (isMedicationQuery(trimmed)) {
      setMedicationWarning(
        '⚠️ تم حظر هذا العنصر تلقائياً لأنه مصنف كدواء أو مستحضر صيدلاني. نظام السوبرماركت مخصص لسلع الأغذية والتغذية والمواد الاستهلاكية فقط 🛒.'
      );
      setResults([]);
      setIsLoading(false);
      setHasSearched(true);
      return;
    }

    setMedicationWarning(null);
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchSmartProductsOnline(trimmed);
      if (response.isMedication || response.warning) {
        setMedicationWarning(response.warning || '⚠️ تم استبعاد الأدوية من البحث.');
        setResults([]);
      } else {
        setResults(response.results || []);
        // Initialize customizable inputs for each result
        const qtys: Record<string, number> = {};
        const costs: Record<string, number> = {};
        const sells: Record<string, number> = {};
        const imgIdxs: Record<string, number> = {};

        (response.results || []).forEach((r) => {
          qtys[r.id] = 10;
          costs[r.id] = r.costPrice;
          sells[r.id] = r.sellingPrice;
          imgIdxs[r.id] = 0;
        });

        setCustomQtys((prev) => ({ ...prev, ...qtys }));
        setCustomCostPrices((prev) => ({ ...prev, ...costs }));
        setCustomSellingPrices((prev) => ({ ...prev, ...sells }));
        setSelectedImageIndices((prev) => ({ ...prev, ...imgIdxs }));
      }
    } catch (err) {
      console.error('Smart search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial auto-search with popular list or empty query when opened
  useEffect(() => {
    if (isOpen) {
      setAddedProductIds(new Set());
      if (!searchQuery) {
        setSearchQuery('إفري');
        performSearch('إفري');
      }
    }
  }, [isOpen]);

  // Debounced live search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, performSearch]);

  if (!isOpen) return null;

  // Add a single product to Database
  const handleAddProduct = async (item: SmartProductResult) => {
    const cost = customCostPrices[item.id] ?? item.costPrice;
    const sell = customSellingPrices[item.id] ?? item.sellingPrice;
    const qty = customQtys[item.id] ?? 10;
    const imgIndex = selectedImageIndices[item.id] ?? 0;
    const resolvedImage =
      (item.alternativeImages && item.alternativeImages[imgIndex]) ||
      item.imageUrl ||
      generateOfflineProductSvg(item.name, item.category);

    const profitMargin = cost > 0 ? ((sell - cost) / cost) * 100 : 0;

    const newProduct: Omit<Product, 'id'> = {
      name: item.name,
      category: item.category,
      barcode: item.barcode,
      unit: (item.unit as UnitType) || 'piece',
      stockQuantity: qty,
      minStockAlert: 5,
      costPrice: cost,
      sellingPrice: sell,
      profitMargin: Math.round(profitMargin * 10) / 10,
      isScaleItem: item.isScaleItem || item.unit === 'kg',
      image: resolvedImage,
      notes: `${item.description} (تم استيراده عبر بحث Google الذكي 🇩🇿)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const newId = await db.products.add(newProduct as Product);
      // Record initial inventory movement
      await db.stockMovements.add({
        productId: newId,
        productName: newProduct.name,
        type: 'purchase',
        quantityChange: qty,
        previousStock: 0,
        newStock: qty,
        unit: newProduct.unit,
        date: new Date().toISOString().split('T')[0],
        reason: 'إضافة منتج من البحث الذكي Google Search API',
        createdAt: new Date().toISOString(),
      });

      setAddedProductIds((prev) => new Set([...prev, item.id]));
      triggerRefresh();
      if (playSuccessSound) playSuccessSound();
      if (onProductAdded) {
        onProductAdded({ ...newProduct, id: newId } as Product);
      }
    } catch (e) {
      console.error('Error saving product to DB:', e);
      alert('حدث خطأ أثناء حفظ المنتج في قاعدة البيانات.');
    }
  };

  // Add all displayed products in bulk
  const handleAddAllBulk = async () => {
    const unadded = results.filter((r) => !addedProductIds.has(r.id));
    if (unadded.length === 0) return;

    setIsAddingBulk(true);
    for (const item of unadded) {
      await handleAddProduct(item);
    }
    setIsAddingBulk(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google 4-Color Branding */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Google Logo representation */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-blue-600 font-black text-xl tracking-tighter">G</span>
              <span className="text-red-500 font-black text-xl tracking-tighter">o</span>
              <span className="text-amber-500 font-black text-xl tracking-tighter">o</span>
              <span className="text-blue-600 font-black text-xl tracking-tighter">g</span>
              <span className="text-emerald-500 font-black text-xl tracking-tighter">l</span>
              <span className="text-red-500 font-black text-xl tracking-tighter">e</span>
              <span className="mr-1 text-[11px] font-bold text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded-md">
                Search API 🇩🇿
              </span>
            </div>

            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                <span>البحث الذكي في سلع السوبرماركت بالجزائر</span>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                  جلب تلقائي للبيانات والصور 📸
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                تصفية صارمة لسلع السوبرماركت والتغذية مع استبعاد تام للأدوية والمواد الصيدلانية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {results.length > 0 && results.some((r) => !addedProductIds.has(r.id)) && (
              <button
                type="button"
                onClick={handleAddAllBulk}
                disabled={isAddingBulk}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {isAddingBulk ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PackagePlus className="w-3.5 h-3.5" />
                )}
                <span>إضافة كل السلع المعروضة إلى المحل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Algerian Tags */}
        <div className="p-4 bg-gray-50/90 border-b border-gray-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <div className="absolute right-3.5 top-3 flex items-center gap-1.5 pointer-events-none">
                <Search className="w-4 h-4 text-blue-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch(searchQuery);
                  }
                }}
                placeholder="ابحث عن أي سلعة غذائية أو ماركة جزائرية (مثال: إفري، كانديا، زيت عافية، طماطم عمور، حمود بوعلام، بيمو...)"
                className="w-full bg-white border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 text-gray-900 rounded-full pr-10 pl-24 py-2.5 text-xs focus:outline-none font-bold shadow-xs transition-all"
                autoFocus
              />
              <div className="absolute left-3 top-2.5 flex items-center gap-1.5">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setResults([]);
                      setMedicationWarning(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                ) : null}
                <span className="text-[10px] font-bold text-gray-500 border-r border-gray-200 pr-1.5">
                  🇩🇿 الجزائر
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => performSearch(searchQuery)}
              disabled={isLoading || !searchQuery.trim()}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-xs shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>بحث في Google</span>
            </button>
          </div>

          {/* Quick Tags for Popular Algerian Supermarket Items */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-gray-400 shrink-0 font-bold text-[10px]">سلع سريعة:</span>
            {popularAlgerianGroceries.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSearchQuery(item);
                  performSearch(item);
                }}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 hover:border-blue-300 border border-gray-200 rounded-full shrink-0 transition-colors shadow-2xs font-medium text-[11px]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Medication Warning Banner */}
        {medicationWarning && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shrink-0 animate-in fade-in">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">{medicationWarning}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                تنبيه أمان: تم تفعيل فلتر السوبرماركت لمنع عرض الأدوية والمضادات الحيوية والمسكنات
                الصيدلانية والتركيز حصراً على المواد الغذائية والتغذية.
              </p>
            </div>
          </div>
        )}

        {/* Modal Body - Search Results Cards */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-slate-50">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-pulse shadow-sm">
                <Globe className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  جارٍ البحث الذكي عبر Google Search API عن "{searchQuery}"...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  مطابقة سلع السوبرماركت الجزائرية وجلب الصور التلقائية والأسعار التقديرية
                </p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <span>نتائج البحث المباشر في Google ({results.length} سلعة مطابقة):</span>
                </span>
                <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                  انقر على "إضافة للمخزون" لحفظ المنتج مباشرة في المحل
                </span>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {results.map((item) => {
                  const isAdded = addedProductIds.has(item.id);
                  const currentCost = customCostPrices[item.id] ?? item.costPrice;
                  const currentSell = customSellingPrices[item.id] ?? item.sellingPrice;
                  const currentQty = customQtys[item.id] ?? 10;
                  const currentImgIdx = selectedImageIndices[item.id] ?? 0;
                  const activeImgUrl =
                    (item.alternativeImages && item.alternativeImages[currentImgIdx]) ||
                    item.imageUrl ||
                    generateOfflineProductSvg(item.name, item.category);

                  const profit =
                    currentCost > 0
                      ? Math.round(((currentSell - currentCost) / currentCost) * 100)
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border-2 transition-all p-3.5 flex flex-col justify-between space-y-3 shadow-xs ${
                        isAdded
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      {/* Top: Product Image, Title, Barcode & Category */}
                      <div className="flex items-start gap-3">
                        {/* Auto-Fetched Product Image with selector */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-xl border border-gray-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={activeImgUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = generateOfflineProductSvg(
                                item.name,
                                item.category
                              );
                            }}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] font-bold px-1 rounded">
                            Google 📸
                          </div>
                        </div>

                        {/* Title, Brand, Barcode */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                              {item.category}
                            </span>
                            {item.brand && (
                              <span className="text-[10px] bg-gray-100 text-gray-700 font-medium px-1.5 py-0.5 rounded">
                                {item.brand}
                              </span>
                            )}
                            {item.isScaleItem && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                ⚖️ ميزان
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-snug line-clamp-2">
                            {item.name}
                          </h4>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-gray-600">
                            <Barcode className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-bold">{item.barcode}</span>
                          </div>

                          {/* Alternative Images Switcher if available */}
                          {item.alternativeImages && item.alternativeImages.length > 1 && (
                            <div className="flex items-center gap-1 pt-1">
                              <span className="text-[9px] text-gray-400 font-bold">صور بديلة:</span>
                              <div className="flex items-center gap-1">
                                {item.alternativeImages.slice(0, 4).map((altImg, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedImageIndices((prev) => ({
                                        ...prev,
                                        [item.id]: idx,
                                      }))
                                    }
                                    className={`w-5 h-5 rounded border overflow-hidden transition-all ${
                                      currentImgIdx === idx
                                        ? 'border-blue-600 ring-2 ring-blue-300'
                                        : 'border-gray-300 opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    <img
                                      src={altImg}
                                      alt="alt"
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Editable Price & Quantity Box */}
                      <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200 text-xs">
                        {/* Cost Price */}
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5 font-bold">
                            سعر الشراء:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={currentCost}
                              onChange={(e) =>
                                setCustomCostPrices((prev) => ({
                                  ...prev,
                                  [item.id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 text-center"
                            />
                          </div>
                        </div>

                        {/* Selling Price */}
                        <div>
                          <label className="text-[10px] text-blue-600 block mb-0.5 font-bold">
                            سعر البيع:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={currentSell}
                              onChange={(e) =>
                                setCustomSellingPrices((prev) => ({
                                  ...prev,
                                  [item.id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-full bg-white border border-blue-400 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 text-center"
                            />
                          </div>
                        </div>

                        {/* Stock Quantity */}
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5 font-bold">
                            الكمية الأولية:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="1"
                              value={currentQty}
                              onChange={(e) =>
                                setCustomQtys((prev) => ({
                                  ...prev,
                                  [item.id]: parseFloat(e.target.value) || 1,
                                }))
                              }
                              className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action: Add to Inventory Button & Profit Margin */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-gray-400">الهامش:</span>
                          <span className="font-bold text-emerald-600">+{profit}%</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500 font-medium">الوحدة: {item.unit}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddProduct(item)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>تمت الإضافة للمخزون ✓</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>إضافة للمخزون</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-blue-500 shadow-xs">
                <Search className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">
                  {hasSearched
                    ? `لم يتم العثور على نتائج لـ "${searchQuery}" في سلع السوبرماركت الجزائرية`
                    : 'ابحث عن أي سلعة غذائية أو ماركة جزائرية عبر Google Search API'}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                  النظام يقوم بالبحث الفوري، فلترة الأدوية والعقارات، وجلب صور المنتجات الأصلية
                  وأسعارها المقترحة بالدينار الجزائري.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-lg">
                {popularAlgerianGroceries.slice(0, 10).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setSearchQuery(sample);
                      performSearch(sample);
                    }}
                    className="px-3 py-1 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-full text-xs transition-colors shadow-2xs font-medium"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-gray-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-gray-500">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-gray-700">Google Search API الجزائر:</span>
            <span>بحث مباشر في الكتالوجات الجزائرية ومطابقة الصور الحقيقية</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
