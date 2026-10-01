import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  Percent,
  Search,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, Sale } from '../types';
import { formatCurrency } from '../utils/formatters';

export const StagnantExpiryView: React.FC = () => {
  const { settings, refreshTrigger, triggerRefresh, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [activeTab, setActiveTab] = useState<'stagnant' | 'expiry'>('stagnant');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [allProds, allSales] = await Promise.all([db.products.toArray(), db.sales.toArray()]);
      setProducts(allProds);
      setSales(allSales);
    }
    load();
  }, [refreshTrigger]);

  // Last sold date map for each product
  const productLastSoldMap = useMemo(() => {
    const map: Record<number, string> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId] || map[item.productId] < s.date) {
          map[item.productId] = s.date;
        }
      });
    });
    return map;
  }, [sales]);

  // Stagnant Products (In stock > 0, and not sold for 30+ days or never sold)
  const stagnantList = useMemo(() => {
    const today = new Date();

    return products
      .filter((p) => p.stockQuantity > 0)
      .map((p) => {
        const lastSoldDate = p.id ? productLastSoldMap[p.id] : null;
        let daysSinceLastSale = 999;
        if (lastSoldDate) {
          const diffMs = today.getTime() - new Date(lastSoldDate).getTime();
          daysSinceLastSale = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } else if (p.createdAt) {
          const diffMs = today.getTime() - new Date(p.createdAt).getTime();
          daysSinceLastSale = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        return {
          ...p,
          lastSoldDate: lastSoldDate || 'لم يباع بعد',
          daysSinceLastSale,
          tiedUpCapital: p.stockQuantity * p.costPrice,
        };
      })
      .filter((p) => p.daysSinceLastSale >= 30)
      .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);
  }, [products, productLastSoldMap]);

  // Expiry Products
  const expiryList = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return products
      .filter((p) => p.expiryDate && p.stockQuantity > 0)
      .map((p) => {
        const expDate = p.expiryDate!;
        const diffMs = new Date(expDate).getTime() - today.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const status: 'expired' | 'critical' | 'warning' | 'safe' =
          daysLeft <= 0
            ? 'expired'
            : daysLeft <= 15
            ? 'critical'
            : daysLeft <= 45
            ? 'warning'
            : 'safe';

        return {
          ...p,
          daysLeft,
          status,
          riskValue: p.stockQuantity * p.costPrice,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  // Filtered by search
  const filteredStagnant = useMemo(() => {
    if (!searchQuery.trim()) return stagnantList;
    const q = searchQuery.toLowerCase();
    return stagnantList.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || p.category.toLowerCase().includes(q)
    );
  }, [stagnantList, searchQuery]);

  const filteredExpiry = useMemo(() => {
    if (!searchQuery.trim()) return expiryList;
    const q = searchQuery.toLowerCase();
    return expiryList.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)) || p.category.toLowerCase().includes(q)
    );
  }, [expiryList, searchQuery]);

  // KPIs
  const totalStagnantValue = useMemo(() => {
    return stagnantList.reduce((sum, p) => sum + p.tiedUpCapital, 0);
  }, [stagnantList]);

  const expiredCount = useMemo(() => {
    return expiryList.filter((p) => p.daysLeft <= 0).length;
  }, [expiryList]);

  const nearExpiryCount = useMemo(() => {
    return expiryList.filter((p) => p.daysLeft > 0 && p.daysLeft <= 30).length;
  }, [expiryList]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const stagRows = stagnantList.map((p, i) => ({
      '#': i + 1,
      'اسم المنتج': p.name,
      'الباركود': p.barcode,
      'التصنيف': p.category,
      'الكمية بالمخزن': p.stockQuantity,
      'سعر التكلفة': p.costPrice,
      'رأس المال الراكد المجمد': p.tiedUpCapital,
      'آخر تاريخ بيع': p.lastSoldDate,
      'أيام الركود': p.daysSinceLastSale,
    }));

    const expRows = expiryList.map((p, i) => ({
      '#': i + 1,
      'اسم المنتج': p.name,
      'الباركود': p.barcode,
      'التصنيف': p.category,
      'الكمية بالمخزن': p.stockQuantity,
      'تاريخ الصلاحية': p.expiryDate,
      'الأيام المتبقية': p.daysLeft <= 0 ? 'منتهي الصلاحية' : `${p.daysLeft} يوم`,
      'قيمة البضاعة المعرضة للخطر': p.riskValue,
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stagRows), 'المنتجات الراكدة');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'مراقبة الصلاحية');
    XLSX.writeFile(wb, `مراقبة_الركود_والصلاحية_${new Date().toISOString().slice(0, 10)}.xlsx`);
    playSuccessSound();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">مراقبة المنتجات الراكدة وتواريخ الصلاحية</h1>
            <p className="text-xs text-gray-500">حماية رأس المال من التلف والركود وسرعة تصريف البضائع البطيئة</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>تصدير تقرير Excel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-800">أصناف راكدة (+30 يوماً بدون بيع)</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono mt-1">{stagnantList.length} صنف</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            رأس مال مجمد: <span className="font-bold text-gray-800">{formatCurrency(totalStagnantValue, currency)}</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
          <span className="text-xs font-bold text-red-700">بضائع قاربت على الانتهاء (&lt;30 يوماً)</span>
          <p className="text-xl font-extrabold text-red-600 font-mono mt-1">{nearExpiryCount} صنف</p>
          <p className="text-[11px] text-gray-400 mt-0.5">تحتاج إلى عروض وتخفيضات لتصريفها سريعاً</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-300 shadow-xs bg-red-50/40">
          <span className="text-xs font-bold text-red-800">منتجات منتهية الصلاحية تماماً</span>
          <p className="text-xl font-extrabold text-red-700 font-mono mt-1">{expiredCount} صنف</p>
          <p className="text-[11px] text-red-600 font-semibold mt-0.5">يجب سحبها فوراً من رفوف المتجر</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('stagnant')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stagnant'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>البضاعة الراكدة ({stagnantList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expiry')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'expiry'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>مراقبة الصلاحية ({expiryList.length})</span>
          </button>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث عن سلعة أو باركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white"
          />
        </div>
      </div>

      {/* Content Tables */}
      {activeTab === 'stagnant' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-amber-50/70 border-b border-amber-200 text-amber-900 font-bold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">اسم المنتج</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">الكمية المتكدسة</th>
                  <th className="p-3 text-left">سعر التكلفة</th>
                  <th className="p-3 text-left">قيمة المال المجمد</th>
                  <th className="p-3 text-center">آخر حركة بيع</th>
                  <th className="p-3 text-center">أيام الركود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStagnant.length > 0 ? (
                  filteredStagnant.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.barcode && <div className="text-[10px] text-gray-400 font-mono">{p.barcode}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800">
                        {p.stockQuantity} {p.unit}
                      </td>
                      <td className="p-3 text-left font-mono text-gray-600">{formatCurrency(p.costPrice, currency)}</td>
                      <td className="p-3 text-left font-mono font-bold text-amber-800">
                        {formatCurrency(p.tiedUpCapital, currency)}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-600 text-[11px]">{p.lastSoldDate}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold font-mono text-[10px]">
                          {p.daysSinceLastSale} يوم
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      ممتاز! لا توجد منتجات راكدة مطابقة للشروط
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-red-50/70 border-b border-red-200 text-red-900 font-bold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">اسم المنتج</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">الكمية الحالية</th>
                  <th className="p-3 text-center">تاريخ الصلاحية</th>
                  <th className="p-3 text-center">الحالة والأيام</th>
                  <th className="p-3 text-left">قيمة البضاعة المعرضة للخطر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpiry.length > 0 ? (
                  filteredExpiry.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.barcode && <div className="text-[10px] text-gray-400 font-mono">{p.barcode}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800">
                        {p.stockQuantity} {p.unit}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800">{p.expiryDate}</td>
                      <td className="p-3 text-center">
                        {p.daysLeft <= 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px]">
                            منتهي الصلاحية (اسحبه فوراً)
                          </span>
                        ) : p.daysLeft <= 15 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                            متبقي {p.daysLeft} يوم فقط!
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                            متبقي {p.daysLeft} يوم
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-red-700">
                        {formatCurrency(p.riskValue, currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      لا توجد سلع بتاريخ صلاحية مسجل
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
