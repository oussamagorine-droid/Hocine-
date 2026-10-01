import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Calendar,
  Filter,
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { Sale, Expense, Product } from '../types';
import { formatCurrency, getLocalDateStr } from '../utils/formatters';

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export const ProfitLossView: React.FC = () => {
  const { settings, refreshTrigger, triggerRefresh, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Date Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load Data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [allSales, allExpenses, allProducts] = await Promise.all([
          db.sales.toArray(),
          db.expenses.toArray(),
          db.products.toArray(),
        ]);
        setSales(allSales);
        setExpenses(allExpenses);
        setProducts(allProducts);
      } catch (err) {
        console.error('Error loading financial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  // Compute Active Date Range
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    if (datePreset === 'today') {
      return { startDateStr: todayStr, endDateStr: todayStr, periodLabel: 'اليوم' };
    }
    if (datePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      return { startDateStr: yStr, endDateStr: yStr, periodLabel: 'أمس' };
    }
    if (datePreset === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      return { startDateStr: getLocalDateStr(d7), endDateStr: todayStr, periodLabel: 'هذا الأسبوع (آخر 7 أيام)' };
    }
    if (datePreset === '30days') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      return { startDateStr: getLocalDateStr(d30), endDateStr: todayStr, periodLabel: 'آخر 30 يوماً' };
    }
    if (datePreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDateStr: getLocalDateStr(firstDay), endDateStr: todayStr, periodLabel: 'هذا الشهر' };
    }
    if (datePreset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDateStr: getLocalDateStr(firstDayLastMonth), endDateStr: getLocalDateStr(lastDayLastMonth), periodLabel: 'الشهر السابق' };
    }
    if (datePreset === 'this_year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      return { startDateStr: getLocalDateStr(firstDayYear), endDateStr: todayStr, periodLabel: 'هذه السنة' };
    }
    if (datePreset === 'custom') {
      return {
        startDateStr: customStartDate || '1970-01-01',
        endDateStr: customEndDate || '2099-12-31',
        periodLabel: `من ${customStartDate || 'البداية'} إلى ${customEndDate || 'الآن'}`,
      };
    }
    return { startDateStr: '1970-01-01', endDateStr: '2099-12-31', periodLabel: 'كافة الفترات' };
  }, [datePreset, customStartDate, customEndDate]);

  // Filter Sales & Expenses within date range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const sDate = s.date;
      if (sDate < startDateStr || sDate > endDateStr) return false;
      return true;
    });
  }, [sales, startDateStr, endDateStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const eDate = e.date;
      if (eDate < startDateStr || eDate > endDateStr) return false;
      return true;
    });
  }, [expenses, startDateStr, endDateStr]);

  // Financial Metrics Calculation
  const financialSummary = useMemo(() => {
    let totalRevenue = 0; // Total sales amount
    let totalCogs = 0; // Cost of goods sold
    let totalDiscounts = 0;
    let totalSalesProfit = 0; // Gross profit from merchandise

    filteredSales.forEach((sale) => {
      totalRevenue += Number(sale.totalAmount) || 0;
      totalDiscounts += Number(sale.discount) || 0;

      // Calculate cost per item or sale.totalCost
      const cost = Number(sale.totalCost) || 0;
      totalCogs += cost;

      const prof = Number(sale.profit) || (sale.totalAmount - cost);
      totalSalesProfit += prof;
    });

    const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalSalesProfit - totalOperatingExpenses;
    const grossMarginPercent = totalRevenue > 0 ? (totalSalesProfit / totalRevenue) * 100 : 0;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const avgInvoiceProfit = filteredSales.length > 0 ? totalSalesProfit / filteredSales.length : 0;

    return {
      totalRevenue,
      totalCogs,
      totalDiscounts,
      totalSalesProfit, // Gross Profit
      totalOperatingExpenses,
      netProfit, // Net Profit after expenses
      grossMarginPercent,
      netMarginPercent,
      invoicesCount: filteredSales.length,
      avgInvoiceProfit,
    };
  }, [filteredSales, filteredExpenses]);

  // Daily Chart Timeline Data
  const dailyTimelineData = useMemo(() => {
    const dayMap: Record<string, { date: string; revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number }> = {};

    filteredSales.forEach((s) => {
      const d = s.date;
      if (!dayMap[d]) {
        dayMap[d] = { date: d, revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 };
      }
      const rev = Number(s.totalAmount) || 0;
      const cost = Number(s.totalCost) || 0;
      const prof = Number(s.profit) || (rev - cost);
      dayMap[d].revenue += rev;
      dayMap[d].cogs += cost;
      dayMap[d].grossProfit += prof;
    });

    filteredExpenses.forEach((e) => {
      const d = e.date;
      if (!dayMap[d]) {
        dayMap[d] = { date: d, revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 };
      }
      dayMap[d].expenses += Number(e.amount) || 0;
    });

    const result = Object.values(dayMap).map((item) => ({
      ...item,
      netProfit: item.grossProfit - item.expenses,
      shortDate: item.date.slice(5), // MM-DD
    }));

    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [filteredSales, filteredExpenses]);

  // Category Profit Breakdown
  const categoryProfitData = useMemo(() => {
    const catMap: Record<string, { name: string; revenue: number; profit: number }> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'مواد غذائية عامة';
        if (!catMap[cat]) {
          catMap[cat] = { name: cat, revenue: 0, profit: 0 };
        }
        catMap[cat].revenue += Number(item.total) || 0;
        catMap[cat].profit += Number(item.profit) || 0;
      });
    });

    return Object.values(catMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 7);
  }, [filteredSales, products]);

  // Product Level Profitability (Top & Bottom)
  const productProfitStats = useMemo(() => {
    const pMap: Record<
      number,
      {
        id: number;
        name: string;
        barcode: string;
        category: string;
        soldQty: number;
        revenue: number;
        cost: number;
        profit: number;
        unit: string;
      }
    > = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!pMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          pMap[item.productId] = {
            id: item.productId,
            name: item.productName || prod?.name || 'صنف غير معروف',
            barcode: item.barcode || prod?.barcode || '',
            category: prod?.category || 'عام',
            soldQty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            unit: item.unit || 'قطعة',
          };
        }
        pMap[item.productId].soldQty += Number(item.quantity) || 0;
        pMap[item.productId].revenue += Number(item.total) || 0;
        const lineCost = (Number(item.quantity) || 0) * (Number(item.costPrice) || 0);
        pMap[item.productId].cost += lineCost;
        pMap[item.productId].profit += Number(item.profit) || (Number(item.total) || 0) - lineCost;
      });
    });

    const list = Object.values(pMap);
    list.sort((a, b) => b.profit - a.profit);
    return list;
  }, [filteredSales, products]);

  // Filtered by Category selection
  const displayedProductProfits = useMemo(() => {
    if (categoryFilter === 'all') return productProfitStats;
    return productProfitStats.filter((p) => p.category === categoryFilter);
  }, [productProfitStats, categoryFilter]);

  // Available categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    productProfitStats.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [productProfitStats]);

  // Expenses breakdown by category
  const expenseBreakdown = useMemo(() => {
    const expMap: Record<string, { category: string; categoryNameAr: string; total: number; count: number }> = {};
    filteredExpenses.forEach((e) => {
      const key = e.category || 'other';
      if (!expMap[key]) {
        expMap[key] = {
          category: key,
          categoryNameAr: e.categoryNameAr || key,
          total: 0,
          count: 0,
        };
      }
      expMap[key].total += Number(e.amount) || 0;
      expMap[key].count += 1;
    });
    return Object.values(expMap).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Export to Excel
  const handleExportExcel = () => {
    const pnlSummary = [
      { 'البند المالي': 'إجمالي الإيرادات والمبيعات (Revenue)', 'المبلغ': financialSummary.totalRevenue, 'العملة': currency },
      { 'البند المالي': 'تكلفة البضاعة المباعة (COGS)', 'المبلغ': financialSummary.totalCogs, 'العملة': currency },
      { 'البند المالي': 'إجمالي الربح التجاري (Gross Profit)', 'المبلغ': financialSummary.totalSalesProfit, 'العملة': currency },
      { 'البند المالي': 'نسبة هامش الربح الإجمالي', 'المبلغ': `${financialSummary.grossMarginPercent.toFixed(1)}%`, 'العملة': '' },
      { 'البند المالي': 'إجمالي المصاريف التشغيلية (Expenses)', 'المبلغ': financialSummary.totalOperatingExpenses, 'العملة': currency },
      { 'البند المالي': 'صافي الربح الحقيقي بعد المصاريف (Net Profit)', 'المبلغ': financialSummary.netProfit, 'العملة': currency },
      { 'البند المالي': 'نسبة صافي الربح الحقيقي', 'المبلغ': `${financialSummary.netMarginPercent.toFixed(1)}%`, 'العملة': '' },
      { 'البند المالي': 'عدد الفواتير المنفذة', 'المبلغ': financialSummary.invoicesCount, 'العملة': 'فاتورة' },
    ];

    const productsExport = displayedProductProfits.map((p, idx) => ({
      'الترتيب': idx + 1,
      'اسم المنتج': p.name,
      'الباركود': p.barcode,
      'التصنيف': p.category,
      'الكمية المباعة': p.soldQty,
      'إجمالي المبيعات': p.revenue,
      'إجمالي التكلفة': p.cost,
      'صافي الأرباح المحققة': p.profit,
      'هامش الربح (%)': p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%',
    }));

    const expensesExport = expenseBreakdown.map((e) => ({
      'نوع المصروف': e.categoryNameAr,
      'إجمالي المنصرف': e.total,
      'العدد': e.count,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(pnlSummary);
    const wsProducts = XLSX.utils.json_to_sheet(productsExport);
    const wsExpenses = XLSX.utils.json_to_sheet(expensesExport);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'قائمة الدخل P&L');
    XLSX.utils.book_append_sheet(wb, wsProducts, 'أرباح المنتجات');
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'تفصيل المصاريف');

    XLSX.writeFile(wb, `تقرير_الارباح_والخسائر_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    playSuccessSound();
  };

  const handlePrintReport = () => {
    window.print();
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-5" dir="rtl">
      {/* Top Header & Period Selector */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                تقرير الأرباح والخسائر والتحليل المالي (P&L)
              </h1>
              <p className="text-xs text-gray-500">
                حساب دقيق للمبيعات، تكلفة البضاعة المباعة (COGS)، المصاريف، وصافي الأرباح الحقيقية
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Period Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            title="تصدير شيت Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-xs transition-all active:scale-95"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={() => triggerRefresh()}
            className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter Badges Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
          {(
            [
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: '7days', label: 'آخر 7 أيام' },
              { id: '30days', label: 'آخر 30 يوماً' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: 'last_month', label: 'الشهر السابق' },
              { id: 'this_year', label: 'هذا العام' },
              { id: 'all', label: 'كافة الفترات' },
              { id: 'custom', label: 'فترة مخصصة' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDatePreset(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                datePreset === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <span className="text-gray-500 font-semibold">من:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
            />
            <span className="text-gray-500 font-semibold">إلى:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
            />
          </div>
        )}
      </div>

      {/* Main KPI Financial Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">إجمالي المبيعات (الإيرادات)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-extrabold text-gray-900 font-mono">
              {formatCurrency(financialSummary.totalRevenue, currency)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              عدد الفواتير: <span className="font-bold text-gray-700">{financialSummary.invoicesCount}</span> فاتورة
            </p>
          </div>
        </div>

        {/* 2. Cost of Goods Sold (COGS) */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">تكلفة البضاعة المباعة (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-extrabold text-slate-800 font-mono">
              {formatCurrency(financialSummary.totalCogs, currency)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              التكلفة المباشرة لأسعار شراء السلع المباعة
            </p>
          </div>
        </div>

        {/* 3. Gross Merchandise Profit */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">إجمالي أرباح السلع (Gross)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-extrabold text-emerald-700 font-mono">
              {formatCurrency(financialSummary.totalSalesProfit, currency)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                هامش: {financialSummary.grossMarginPercent.toFixed(1)}%
              </span>
              <span className="text-[11px] text-gray-400">قبل خصم المصاريف</span>
            </div>
          </div>
        </div>

        {/* 4. Real Net Profit (Bottom Line) */}
        <div
          className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${
            financialSummary.netProfit >= 0
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/90">صافي الربح الحقيقي (Net Profit)</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              {financialSummary.netProfit >= 0 ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black font-mono tracking-tight">
              {formatCurrency(financialSummary.netProfit, currency)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-white/90 mt-1 font-semibold">
              <span>مصاريف مخصومة: {formatCurrency(financialSummary.totalOperatingExpenses, currency)}</span>
              <span>صافي: {financialSummary.netMarginPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Daily Timeline & Category Profit Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Daily Profit & Revenue Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-800">
                المسار الزمني للإيرادات والأرباح اليومية ({periodLabel})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                المبيعات
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                صافي الأرباح
              </span>
            </div>
          </div>

          <div className="h-64 w-full" dir="ltr">
            {dailyTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '11px',
                      border: 'none',
                      direction: 'rtl',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val), currency), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="المبيعات"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netProfit"
                    name="صافي الربح"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <AlertCircle className="w-8 h-8 text-gray-300 mb-1" />
                <span>لا توجد حركات بيع مسجلة خلال الفترة المختارة ({periodLabel})</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Profit Share Pie Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-bold text-gray-800">توزيع الأرباح حسب الفئات</h3>
          </div>

          <div className="h-52 w-full flex items-center justify-center" dir="ltr">
            {categoryProfitData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryProfitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="profit"
                  >
                    {categoryProfitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '11px',
                      direction: 'rtl',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val), currency), 'الأرباح']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-gray-400">لا توجد بيانات كافية</span>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 max-h-36 overflow-y-auto">
            {categoryProfitData.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <span className="font-semibold text-gray-700 truncate max-w-[130px]">{cat.name}</span>
                </div>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatCurrency(cat.profit, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Income Statement Table (قائمة الدخل الرسمية) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">
              قائمة الدخل والأرباح والخسائر الرسمية (P&L Income Statement)
            </h3>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">الفترة: {periodLabel}</span>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <tbody>
              {/* Revenue Section */}
              <tr className="bg-blue-50/70 border-b border-blue-100 font-bold text-blue-900">
                <td className="p-2.5">1. الإيرادات التشغيلية (المبيعات)</td>
                <td className="p-2.5 text-left font-mono">{formatCurrency(financialSummary.totalRevenue, currency)}</td>
              </tr>
              <tr className="border-b border-gray-100 text-gray-600">
                <td className="p-2 pr-6">مبيعات المنتجات المحققة عبر نقاط البيع POS</td>
                <td className="p-2 text-left font-mono text-gray-800">
                  {formatCurrency(financialSummary.totalRevenue + financialSummary.totalDiscounts, currency)}
                </td>
              </tr>
              {financialSummary.totalDiscounts > 0 && (
                <tr className="border-b border-gray-100 text-red-600">
                  <td className="p-2 pr-6">(-) إجمالي الخصومات الممنوحة للزبائن</td>
                  <td className="p-2 text-left font-mono">
                    -{formatCurrency(financialSummary.totalDiscounts, currency)}
                  </td>
                </tr>
              )}

              {/* COGS Section */}
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
                <td className="p-2.5">2. تكلفة البضاعة المباعة (COGS)</td>
                <td className="p-2.5 text-left font-mono text-red-600">
                  -{formatCurrency(financialSummary.totalCogs, currency)}
                </td>
              </tr>
              <tr className="border-b border-gray-100 text-gray-600">
                <td className="p-2 pr-6">تكلفة شراء السلع والمنتجات المسحوبة من المخزون</td>
                <td className="p-2 text-left font-mono">
                  {formatCurrency(financialSummary.totalCogs, currency)}
                </td>
              </tr>

              {/* Gross Profit Result */}
              <tr className="bg-emerald-50 border-b border-emerald-200 font-extrabold text-emerald-900">
                <td className="p-3">
                  = إجمالي الربح التجاري (Gross Profit)
                  <span className="text-[11px] font-normal text-emerald-700 mr-2">
                    (هامش ربح إجمالي {financialSummary.grossMarginPercent.toFixed(1)}%)
                  </span>
                </td>
                <td className="p-3 text-left font-mono text-emerald-700 text-sm">
                  {formatCurrency(financialSummary.totalSalesProfit, currency)}
                </td>
              </tr>

              {/* Operating Expenses Section */}
              <tr className="bg-amber-50/70 border-b border-amber-100 font-bold text-amber-900">
                <td className="p-2.5">3. المصاريف التشغيلية واليومية (Operating Expenses)</td>
                <td className="p-2.5 text-left font-mono text-red-600">
                  -{formatCurrency(financialSummary.totalOperatingExpenses, currency)}
                </td>
              </tr>
              {expenseBreakdown.length > 0 ? (
                expenseBreakdown.map((exp) => (
                  <tr key={exp.category} className="border-b border-gray-100 text-gray-600 text-[11px]">
                    <td className="p-1.5 pr-6">
                      • {exp.categoryNameAr} ({exp.count} سندات صرف)
                    </td>
                    <td className="p-1.5 text-left font-mono text-gray-700">
                      -{formatCurrency(exp.total, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-100 text-gray-400 text-[11px]">
                  <td className="p-2 pr-6">لا توجد مصاريف تشغيلية مسجلة خلال هذه الفترة</td>
                  <td className="p-2 text-left font-mono">0 {currency}</td>
                </tr>
              )}

              {/* Final Net Profit Row */}
              <tr
                className={`text-sm font-black ${
                  financialSummary.netProfit >= 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                <td className="p-4 rounded-r-lg">
                  صافي الأرباح الصافية بعد كافة التكاليف (Net Income / Profit)
                  <span className="text-xs font-normal text-white/90 mr-2">
                    (هامش صافي {financialSummary.netMarginPercent.toFixed(1)}%)
                  </span>
                </td>
                <td className="p-4 text-left font-mono text-base rounded-l-lg">
                  {formatCurrency(financialSummary.netProfit, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Profitable Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">
              أرباح المنتجات والسلع بالتفصيل ({displayedProductProfits.length} صنف مباع)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
            >
              <option value="all">كافة الفئات والتصنيفات</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 font-bold">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">اسم المنتج</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3 text-center">الكمية المباعة</th>
                <th className="p-3 text-left">إجمالي المبيعات</th>
                <th className="p-3 text-left">إجمالي التكلفة</th>
                <th className="p-3 text-left">صافي الربح</th>
                <th className="p-3 text-center">هامش الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedProductProfits.length > 0 ? (
                displayedProductProfits.slice(0, 30).map((p, idx) => {
                  const marginPct = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.barcode && <div className="text-[10px] text-gray-400 font-mono">{p.barcode}</div>}
                      </td>
                      <td className="p-3 text-gray-600">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800">
                        {p.soldQty} {p.unit}
                      </td>
                      <td className="p-3 text-left font-mono font-semibold text-gray-800">
                        {formatCurrency(p.revenue, currency)}
                      </td>
                      <td className="p-3 text-left font-mono text-gray-500">
                        {formatCurrency(p.cost, currency)}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-700">
                        {formatCurrency(p.profit, currency)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                            marginPct >= 20
                              ? 'bg-emerald-100 text-emerald-800'
                              : marginPct > 5
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    لا توجد منتجات مباعة خلال هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
