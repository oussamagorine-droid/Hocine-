import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  ShoppingBag,
  FileSpreadsheet,
  Printer,
  Package,
  Layers,
  Search,
  Eye,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, Sale } from '../types';
import {
  formatCurrency,
  getLocalDateStr,
  getPeriodDateRange,
  isDateInPeriod,
  isDateInRange,
  normalizeDateStr,
  PeriodFilter,
} from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';

export const ReportsView: React.FC = () => {
  const { settings, refreshTrigger, triggerRefresh, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Date Filter Preset & Custom Range
  const [datePreset, setDatePreset] = useState<PeriodFilter>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(getLocalDateStr());
  const [customEndDate, setCustomEndDate] = useState<string>(getLocalDateStr());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Sale for Details & Printing
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([db.sales.reverse().toArray(), db.products.toArray()]);
        setSales(s);
        setProducts(p);
      } catch (err) {
        console.error('Error loading reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshTrigger]);

  // Compute Active Date Range Details
  const activePeriodInfo = useMemo(() => {
    if (datePreset === 'custom') {
      return {
        start: customStartDate || '1970-01-01',
        end: customEndDate || '2099-12-31',
        label: `فترة مخصصة (${customStartDate} إلى ${customEndDate})`,
      };
    }
    const info = getPeriodDateRange(datePreset);
    return {
      start: info.start,
      end: info.end,
      label: info.label,
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Filter sales based on chosen date range and search query
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const recordDate = s.date || (s.createdAt ? normalizeDateStr(s.createdAt) : '');
      if (!recordDate) return false;

      // Date match
      let dateMatched = false;
      if (datePreset === 'custom') {
        dateMatched = isDateInRange(recordDate, customStartDate, customEndDate);
      } else {
        dateMatched = isDateInPeriod(recordDate, datePreset);
      }
      if (!dateMatched) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = s.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (s.customerName || '').toLowerCase().includes(q);
        const matchCashier = (s.cashierName || '').toLowerCase().includes(q);
        if (!matchInv && !matchCust && !matchCashier) return false;
      }

      return true;
    });
  }, [sales, datePreset, customStartDate, customEndDate, searchQuery]);

  // Aggregated KPIs
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }, [filteredSales]);

  const totalCost = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [filteredSales]);

  const totalProfit = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.profit || (s.totalAmount - (s.totalCost || 0))), 0);
  }, [filteredSales]);

  const profitMarginPercent = useMemo(() => {
    if (totalCost <= 0) return totalRevenue > 0 ? 100 : 0;
    return (totalProfit / totalCost) * 100;
  }, [totalProfit, totalCost, totalRevenue]);

  const totalCashCollected = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  }, [filteredSales]);

  const totalDebtAccrued = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.remainingDebt || 0), 0);
  }, [filteredSales]);

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0), 0);
  }, [filteredSales]);

  const avgTicket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalRevenue / filteredSales.length;
  }, [totalRevenue, filteredSales]);

  // Dynamic Chart Data aggregation according to period
  const chartData = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    if (datePreset === 'today') {
      // 8 time slots during business hours
      const slots = [
        { label: '08:00 - 10:00', startHour: 8, endHour: 10, sales: 0, profit: 0 },
        { label: '10:00 - 12:00', startHour: 10, endHour: 12, sales: 0, profit: 0 },
        { label: '12:00 - 14:00', startHour: 12, endHour: 14, sales: 0, profit: 0 },
        { label: '14:00 - 16:00', startHour: 14, endHour: 16, sales: 0, profit: 0 },
        { label: '16:00 - 18:00', startHour: 16, endHour: 18, sales: 0, profit: 0 },
        { label: '18:00 - 20:00', startHour: 18, endHour: 20, sales: 0, profit: 0 },
        { label: '20:00 - 22:00', startHour: 20, endHour: 22, sales: 0, profit: 0 },
        { label: '22:00 - 00:00', startHour: 22, endHour: 24, sales: 0, profit: 0 },
      ];

      filteredSales.forEach((sale) => {
        let hour = 12;
        if (sale.time) {
          const parts = sale.time.split(':');
          if (parts[0]) hour = parseInt(parts[0], 10);
        }
        const slot = slots.find((sl) => hour >= sl.startHour && hour < sl.endHour) || slots[slots.length - 1];
        slot.sales += sale.totalAmount;
        slot.profit += sale.profit || 0;
      });

      return slots.map((sl) => ({
        date: sl.label,
        sales: sl.sales,
        profit: sl.profit,
      }));
    }

    if (datePreset === 'week') {
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const weekList: { key: string; date: string; sales: number; profit: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = getLocalDateStr(d);
        const dayName = dayNames[d.getDay()];
        const dayNum = d.getDate();
        weekList.push({
          key,
          date: `${dayName} (${dayNum})`,
          sales: 0,
          profit: 0,
        });
      }

      filteredSales.forEach((sale) => {
        const saleKey = normalizeDateStr(sale.date);
        const item = weekList.find((w) => w.key === saleKey);
        if (item) {
          item.sales += sale.totalAmount;
          item.profit += sale.profit || 0;
        }
      });

      return weekList;
    }

    if (datePreset === 'month') {
      const monthList: { key: string; date: string; sales: number; profit: number }[] = [];
      const daysInMonth = now.getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(now.getFullYear(), now.getMonth(), day);
        const key = getLocalDateStr(d);
        monthList.push({
          key,
          date: `${day} ${d.toLocaleDateString('ar-DZ', { month: 'short' })}`,
          sales: 0,
          profit: 0,
        });
      }

      filteredSales.forEach((sale) => {
        const saleKey = normalizeDateStr(sale.date);
        const item = monthList.find((m) => m.key === saleKey);
        if (item) {
          item.sales += sale.totalAmount;
          item.profit += sale.profit || 0;
        }
      });

      return monthList;
    }

    if (datePreset === 'year' || datePreset === 'all') {
      const monthNames = [
        'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
        'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      const currentYear = now.getFullYear();
      const yearList = monthNames.map((name, idx) => ({
        monthIdx: idx,
        date: name,
        sales: 0,
        profit: 0,
      }));

      filteredSales.forEach((sale) => {
        const cleanDate = normalizeDateStr(sale.date);
        if (!cleanDate) return;
        const [yStr, mStr] = cleanDate.split('-');
        const sYear = parseInt(yStr, 10);
        const sMonth = parseInt(mStr, 10) - 1;

        if (datePreset === 'year' && sYear !== currentYear) return;
        if (sMonth >= 0 && sMonth < 12) {
          yearList[sMonth].sales += sale.totalAmount;
          yearList[sMonth].profit += sale.profit || 0;
        }
      });

      return yearList;
    }

    // Custom range: group by day if <= 31 days, otherwise group by month
    const map = new Map<string, { date: string; sales: number; profit: number }>();
    filteredSales.forEach((s) => {
      const cleanDate = normalizeDateStr(s.date);
      const existing = map.get(cleanDate) || { date: cleanDate, sales: 0, profit: 0 };
      existing.sales += s.totalAmount;
      existing.profit += s.profit || 0;
      map.set(cleanDate, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, datePreset]);

  // Best Selling Items in Filtered Period
  const topSellingProducts = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const key = item.productName;
        const current = itemMap.get(key) || { name: key, qty: 0, revenue: 0, profit: 0 };
        current.qty += item.quantity;
        current.revenue += item.total;
        current.profit += item.profit || 0;
        itemMap.set(key, current);
      });
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);
  }, [filteredSales]);

  // Sales by Category in Filtered Period
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'أخرى';
        catMap.set(cat, (catMap.get(cat) || 0) + item.total);
      });
    });

    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f97316'];

    return Array.from(catMap.entries()).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      color: colors[i % colors.length],
    }));
  }, [filteredSales, products]);

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = filteredSales.map((s) => ({
      'رقم الفاتورة': s.invoiceNumber,
      'التاريخ': s.date,
      'الوقت': s.time,
      'الزبون': s.customerName,
      'عدد الأصناف': s.items.length,
      'الإجمالي': s.totalAmount,
      'المدفوع': s.paidAmount,
      'المتبقي (دين)': s.remainingDebt,
      'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقداً' : s.paymentMethod === 'credit' ? 'آجل' : 'جزئي',
      'صافي الربح': s.profit || 0,
      'الكاشير': s.cashierName,
      'العملة': currency,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير المبيعات');
    XLSX.writeFile(wb, `تقرير_المبيعات_${datePreset}_${getLocalDateStr()}.xlsx`);
    playSuccessSound();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]" dir="rtl">
      {/* Header Banner with Filter Tabs & Date Controls */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>التقارير التحليلية والأرباح والمبيعات</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {activePeriodInfo.label}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              تحليل دقيق ومباشر للإيرادات، التكاليف، صافي الأرباح، والديون حسب الفترة المحددة
            </p>
          </div>

          {/* Date Filter Tabs & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-bold">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'الأسبوع' },
                { id: 'month', label: 'الشهر' },
                { id: 'year', label: 'السنة' },
                { id: 'custom', label: 'مخصص 📅' },
                { id: 'all', label: 'الكل' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id as PeriodFilter)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    datePreset === p.id
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={triggerRefresh}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors shadow-2xs"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Bar (Shown when 'custom' is selected or for quick refinement) */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-700">تحديد الفترة المخصصة:</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-600 font-semibold">من:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-600 font-semibold">إلى:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-800 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-blue-700 font-bold mr-auto">
              {filteredSales.length} فاتورة مسجلة في هذا النطاق
            </span>
          </div>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-1 shadow-xs border-r-4 border-r-blue-500">
          <p className="text-xs font-semibold text-gray-500">إجمالي المبيعات ({activePeriodInfo.label}):</p>
          <h3 className="text-2xl font-black text-gray-900 font-mono">{formatCurrency(totalRevenue, currency)}</h3>
          <p className="text-[11px] text-blue-600 font-bold">{filteredSales.length} فاتورة مسجلة ({totalItemsSold} وحدة)</p>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-1 shadow-xs border-r-4 border-r-emerald-500">
          <p className="text-xs font-semibold text-emerald-800">صافي الأرباح المحققة:</p>
          <h3 className="text-2xl font-black text-emerald-700 font-mono">+{formatCurrency(totalProfit, currency)}</h3>
          <p className="text-[11px] text-emerald-600 font-bold">هامش ربح إجمالي: +{profitMarginPercent.toFixed(1)}%</p>
        </div>

        {/* Total Cost COGS */}
        <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-1 shadow-xs border-r-4 border-r-gray-400">
          <p className="text-xs font-semibold text-gray-500">تكلفة البضاعة المباعة (COGS):</p>
          <h3 className="text-2xl font-black text-gray-800 font-mono">{formatCurrency(totalCost, currency)}</h3>
          <p className="text-[11px] text-gray-500 font-semibold">متوسط السلة: {formatCurrency(avgTicket, currency)}</p>
        </div>

        {/* Cash vs Debt */}
        <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-1 shadow-xs border-r-4 border-r-orange-500">
          <p className="text-xs font-semibold text-gray-500">المحصل نقداً مقابل الديون:</p>
          <h3 className="text-lg font-black text-emerald-600 font-mono">
            {formatCurrency(totalCashCollected, currency)} <span className="text-xs text-gray-400 font-normal">نقداً</span>
          </h3>
          <p className="text-[11px] text-rose-600 font-bold">
            {formatCurrency(totalDebtAccrued, currency)} مبيعات بالدين (كريدي)
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sales & Profit Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 p-4 rounded-xl space-y-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>مقارنة المبيعات وصافي الأرباح ({activePeriodInfo.label})</span>
            </h3>
            <span className="text-xs text-gray-500 font-medium">{currency}</span>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val: any) => [`${formatCurrency(Number(val) || 0, currency)}`, '']}
                />
                <Bar dataKey="sales" name="إجمالي المبيعات" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="صافي الربح" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 7 Best Selling Products (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 p-4 rounded-xl space-y-3 flex flex-col justify-between shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>المنتجات الأكثر مبيعاً ({activePeriodInfo.label})</span>
          </h3>

          <div className="space-y-2 overflow-y-auto max-h-60 flex-1">
            {topSellingProducts.map((p, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <div className="truncate">
                    <p className="font-bold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.qty} وحدة مباعة</p>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="font-bold text-blue-600 block">{formatCurrency(p.revenue, currency)}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">+{formatCurrency(p.profit, currency)}</span>
                </div>
              </div>
            ))}

            {topSellingProducts.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-xs">لا توجد مبيعات مسجلة في هذه الفترة</p>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Log Table & Search */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">سجل فواتير المبيعات التفصيلي ({activePeriodInfo.label})</h3>
            <p className="text-xs text-gray-500">عرض {filteredSales.length} فاتورة في هذه الفترة</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو الزبون..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">رقم الفاتورة</th>
                <th className="p-3">التاريخ والوقت</th>
                <th className="p-3">الزبون</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">الإجمالي</th>
                <th className="p-3">المدفوع</th>
                <th className="p-3">المتبقي (دين)</th>
                <th className="p-3">صافي الربح</th>
                <th className="p-3 text-center">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((s) => (
                <tr key={s.id || s.invoiceNumber} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-700">#{s.invoiceNumber}</td>
                  <td className="p-3 text-gray-500 font-mono text-[11px]">
                    {s.date} <span className="text-gray-400">{s.time}</span>
                  </td>
                  <td className="p-3 font-bold text-gray-800">{s.customerName}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        s.paymentMethod === 'cash'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : s.paymentMethod === 'credit'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {s.paymentMethod === 'cash' ? 'نقداً' : s.paymentMethod === 'credit' ? 'دين' : 'جزئي'}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-gray-900">{formatCurrency(s.totalAmount, currency)}</td>
                  <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(s.paidAmount, currency)}</td>
                  <td className="p-3 font-bold text-rose-600">
                    {s.remainingDebt > 0 ? formatCurrency(s.remainingDebt, currency) : '-'}
                  </td>
                  <td className="p-3 font-bold text-emerald-600">+{formatCurrency(s.profit || 0, currency)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedSaleForReceipt(s);
                        setIsReceiptOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 transition-colors shadow-2xs"
                      title="معاينة وطباعة الفاتورة"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    لم يتم العثور على فواتير مبيعات مسجلة في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        sale={selectedSaleForReceipt}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
