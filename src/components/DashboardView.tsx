import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Clock,
  RefreshCw,
  ShoppingBag,
  Flame,
  CheckCircle2,
  Layers,
  Sparkles,
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
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Customer, Expense, Product, Purchase, Sale, Supplier } from '../types';
import { formatCurrency, getLocalDateStr, isDateInPeriod, getPeriodDateRange, PeriodFilter } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const { settings, setActiveTab, refreshTrigger, triggerRefresh, currentUser } = useApp();
  const currency = settings.storeCurrency || 'د.ج';
  const canViewProfits = currentUser?.role === 'admin' || currentUser?.permissions?.canViewProfits !== false;

  const [timeRange, setTimeRange] = useState<PeriodFilter>('month');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load all DB data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [p, s, pur, exp, c, sup] = await Promise.all([
          db.products.toArray(),
          db.sales.toArray(),
          db.purchases.toArray(),
          db.expenses.toArray(),
          db.customers.toArray(),
          db.suppliers.toArray(),
        ]);
        setProducts(p);
        setSales(s);
        setPurchases(pur);
        setExpenses(exp);
        setCustomers(c);
        setSuppliers(sup);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger]);

  // Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    // Active period filtering
    const { label: periodLabel } = getPeriodDateRange(timeRange);

    const filteredSales = sales.filter((s) => isDateInPeriod(s.date, timeRange));
    const filteredExpenses = expenses.filter((e) => isDateInPeriod(e.date, timeRange));
    const filteredPurchases = purchases.filter((p) => isDateInPeriod(p.date, timeRange));

    // Period specific metrics
    const periodSalesTotal = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const periodCOGS = filteredSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const periodGrossProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const periodExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const periodNetProfit = periodGrossProfit - periodExpenses;
    const periodInvoicesCount = filteredSales.length;
    const periodPurchasesTotal = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);

    // Fixed benchmark comparisons for subtext
    const todaySales = sales.filter((s) => isDateInPeriod(s.date, 'today'));
    const weekSales = sales.filter((s) => isDateInPeriod(s.date, 'week'));
    const monthSales = sales.filter((s) => isDateInPeriod(s.date, 'month'));
    const yearSales = sales.filter((s) => isDateInPeriod(s.date, 'year'));

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const weekSalesTotal = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthSalesTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const yearSalesTotal = yearSales.reduce((sum, s) => sum + s.totalAmount, 0);

    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Debts
    const customerDebts = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
    const supplierDebts = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

    // Inventory Valuation
    const inventoryCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
    const inventorySellingValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);
    const expectedInventoryProfit = inventorySellingValue - inventoryCostValue;

    // Product health
    const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0);
    const outOfStockProducts = products.filter((p) => p.stockQuantity <= 0);

    const alertDays = settings.expiryAlertDays || 15;
    const expiredProducts = products.filter((p) => {
      if (!p.expiryDate) return false;
      return new Date(p.expiryDate) < now;
    });
    const nearExpiryProducts = products.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      const diff = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff <= alertDays;
    });

    // Product Sales Frequency & Profit Analysis FOR THE SELECTED PERIOD
    const salesForRanking = filteredSales.length > 0 ? filteredSales : sales;
    const productSalesMap = new Map<number, { qty: number; revenue: number; profit: number; lastDate: string }>();
    for (const sale of salesForRanking) {
      for (const item of sale.items) {
        const existing = productSalesMap.get(item.productId) || {
          qty: 0,
          revenue: 0,
          profit: 0,
          lastDate: sale.date,
        };
        existing.qty += item.quantity;
        existing.revenue += item.total;
        existing.profit += item.profit || 0;
        if (sale.date > existing.lastDate) existing.lastDate = sale.date;
        productSalesMap.set(item.productId, existing);
      }
    }

    // Top Selling Products in active period
    const productsWithSales = products.map((p) => {
      const saleInfo = productSalesMap.get(p.id!) || { qty: 0, revenue: 0, profit: 0, lastDate: '-' };
      return {
        ...p,
        soldQty: saleInfo.qty,
        totalRevenue: saleInfo.revenue,
        totalProfit: saleInfo.profit,
        lastSaleDate: saleInfo.lastDate,
      };
    });

    const topSelling = [...productsWithSales]
      .filter((p) => p.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);

    const mostProfitable = [...productsWithSales]
      .filter((p) => p.totalProfit > 0)
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);

    const leastSelling = [...productsWithSales].sort((a, b) => a.soldQty - b.soldQty).slice(0, 5);

    // Stagnant products (no sales for 30+ days or never sold)
    const stagnantThreshold = settings.stagnantDaysThreshold || 30;
    const stagnantProducts = productsWithSales.filter((p) => {
      if (p.stockQuantity <= 0) return false;
      if (p.lastSaleDate === '-') {
        const createdDays = (now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 3600 * 24);
        return createdDays >= stagnantThreshold;
      }
      const daysSince = (now.getTime() - new Date(p.lastSaleDate).getTime()) / (1000 * 3600 * 24);
      return daysSince >= stagnantThreshold;
    });

    const stagnantCapital = stagnantProducts.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);

    return {
      periodLabel,
      periodSalesTotal,
      periodCOGS,
      periodGrossProfit,
      periodExpenses,
      periodNetProfit,
      periodInvoicesCount,
      periodPurchasesTotal,
      todaySalesTotal,
      weekSalesTotal,
      monthSalesTotal,
      yearSalesTotal,
      totalSalesAmount,
      totalExpenses,
      customerDebts,
      supplierDebts,
      inventoryCostValue,
      inventorySellingValue,
      expectedInventoryProfit,
      totalProductsCount: products.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      expiredCount: expiredProducts.length,
      nearExpiryCount: nearExpiryProducts.length,
      invoicesCount: sales.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      topSelling,
      mostProfitable,
      leastSelling,
      stagnantProducts,
      stagnantCapital,
      lowStockProducts,
    };
  }, [sales, products, purchases, expenses, customers, suppliers, settings, timeRange]);

  // Chart Data Preparation according to selected timeRange
  const chartData = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    if (timeRange === 'today') {
      // 8 time-slot buckets during business day (08:00 to 23:00)
      const slots: { label: string; startHour: number; endHour: number; sales: number; profit: number }[] = [
        { label: '08:00 - 10:00', startHour: 8, endHour: 10, sales: 0, profit: 0 },
        { label: '10:00 - 12:00', startHour: 10, endHour: 12, sales: 0, profit: 0 },
        { label: '12:00 - 14:00', startHour: 12, endHour: 14, sales: 0, profit: 0 },
        { label: '14:00 - 16:00', startHour: 14, endHour: 16, sales: 0, profit: 0 },
        { label: '16:00 - 18:00', startHour: 16, endHour: 18, sales: 0, profit: 0 },
        { label: '18:00 - 20:00', startHour: 18, endHour: 20, sales: 0, profit: 0 },
        { label: '20:00 - 22:00', startHour: 20, endHour: 22, sales: 0, profit: 0 },
        { label: '22:00 - 00:00', startHour: 22, endHour: 24, sales: 0, profit: 0 },
      ];

      const todaySales = sales.filter((s) => s.date === todayStr);
      todaySales.forEach((sale) => {
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

    if (timeRange === 'week') {
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

      sales.forEach((sale) => {
        const item = weekList.find((w) => w.key === sale.date);
        if (item) {
          item.sales += sale.totalAmount;
          item.profit += sale.profit || 0;
        }
      });

      return weekList;
    }

    if (timeRange === 'month') {
      const monthList: { key: string; date: string; sales: number; profit: number }[] = [];
      const daysInMonth = now.getDate(); // from 1st of month to today

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

      sales.forEach((sale) => {
        const item = monthList.find((m) => m.key === sale.date);
        if (item) {
          item.sales += sale.totalAmount;
          item.profit += sale.profit || 0;
        }
      });

      return monthList;
    }

    if (timeRange === 'year' || timeRange === 'all') {
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

      sales.forEach((sale) => {
        if (!sale.date) return;
        const [yStr, mStr] = sale.date.split('-');
        const sYear = parseInt(yStr, 10);
        const sMonth = parseInt(mStr, 10) - 1;

        if (timeRange === 'year' && sYear !== currentYear) return;
        if (sMonth >= 0 && sMonth < 12) {
          yearList[sMonth].sales += sale.totalAmount;
          yearList[sMonth].profit += sale.profit || 0;
        }
      });

      return yearList;
    }

    return [];
  }, [sales, timeRange]);

  // Category sales breakdown for Pie Chart
  const categoryPieData = useMemo(() => {
    const catMap = new Map<string, number>();
    const salesToUse = sales.filter((s) => isDateInPeriod(s.date, timeRange));
    const targetSales = salesToUse.length > 0 ? salesToUse : sales;

    for (const sale of targetSales) {
      for (const item of sale.items) {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'أخرى';
        catMap.set(cat, (catMap.get(cat) || 0) + item.total);
      }
    }

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];
    return Array.from(catMap.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length],
    }));
  }, [sales, products, timeRange]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F1F3F6]" dir="rtl">
      {/* Top Banner with Quick Period Selector & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>ملخص أداء المتجر والعمليات التجارية</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {stats.periodLabel}
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            متابعة شاملة وفورية للمبيعات، الأرباح الصافية، المصاريف والمخزون للفترة المحددة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Filter Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-semibold">
            {(
              [
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'الأسبوع' },
                { id: 'month', label: 'الشهر' },
                { id: 'year', label: 'السنة' },
                { id: 'all', label: 'الكل' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  timeRange === t.id
                    ? 'bg-blue-600 text-white shadow-xs font-bold scale-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={triggerRefresh}
            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid - Responsive to Selected Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Total for Period */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs border-r-4 border-r-blue-500">
          <div className="text-gray-500 text-xs mb-1 font-semibold flex items-center justify-between">
            <span>إجمالي مبيعات ({stats.periodLabel})</span>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">
            {formatCurrency(stats.periodSalesTotal, currency)}
          </div>
          <div className="text-[11px] text-blue-600 mt-2 font-bold flex items-center justify-between">
            <span>{stats.periodInvoicesCount} فاتورة مسجلة</span>
            <span className="text-gray-400 font-normal">اليوم: {formatCurrency(stats.todaySalesTotal, currency)}</span>
          </div>
        </div>

        {/* Net Profit for Period */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs border-r-4 border-r-emerald-500">
          <div className="text-gray-500 text-xs mb-1 font-semibold flex items-center justify-between">
            <span>صافي أرباح ({stats.periodLabel})</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          {canViewProfits ? (
            <>
              <div
                className={`text-2xl font-black font-mono ${
                  stats.periodNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(stats.periodNetProfit, currency)}
              </div>
              <div className="text-[11px] text-gray-500 mt-2 font-bold truncate">
                الربح الإجمالي: <span className="text-emerald-700">{formatCurrency(stats.periodGrossProfit, currency)}</span> | المصاريف: <span className="text-rose-600">{formatCurrency(stats.periodExpenses, currency)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-gray-400 font-mono">
                🔒 •••••••• {currency}
              </div>
              <div className="text-[11px] text-amber-600 mt-2 font-bold">
                محجوب (خاص بصلاحيات المدير)
              </div>
            </>
          )}
        </div>

        {/* Customer Debts */}
        <div
          onClick={() => setActiveTab('debts')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs border-r-4 border-r-orange-500 cursor-pointer hover:border-orange-300 transition-colors"
        >
          <div className="text-gray-500 text-xs mb-1 font-semibold flex items-center justify-between">
            <span>إجمالي الديون (لنا عند الزبائن)</span>
            <CreditCard className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600 font-mono">
            {formatCurrency(stats.customerDebts, currency)}
          </div>
          <div className="text-[11px] text-red-500 mt-2 font-bold underline cursor-pointer">
            {stats.customersCount} زبون مسجل في الحسابات الآجلة
          </div>
        </div>

        {/* Inventory Value */}
        <div
          onClick={() => setActiveTab('products')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs border-r-4 border-r-purple-500 cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="text-gray-500 text-xs mb-1 font-semibold flex items-center justify-between">
            <span>قيمة المخزون الحالي (شراء)</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 font-mono">
            {formatCurrency(stats.inventoryCostValue, currency)}
          </div>
          <div className="text-[11px] text-gray-500 mt-2 font-bold">
            {stats.totalProductsCount} صنف مسجل | بيع: {formatCurrency(stats.inventorySellingValue, currency)}
          </div>
        </div>
      </div>

      {/* Secondary Debts & Financial Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Purchases in period */}
        <div
          onClick={() => setActiveTab('purchases')}
          className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-xs transition-all"
          title="عرض فواتير المشتريات والتوريد"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">مشتريات وتوريد ({stats.periodLabel})</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-700 font-mono mt-2">{formatCurrency(stats.periodPurchasesTotal, currency)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">تكلفة بضاعة المبيعات: {formatCurrency(stats.periodCOGS, currency)}</p>
        </div>

        {/* Supplier Debts */}
        <div
          onClick={() => setActiveTab('debts')}
          className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">ديون الموردين (علينا)</span>
            </div>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg font-bold text-rose-600 font-mono mt-2">{formatCurrency(stats.supplierDebts, currency)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">من {stats.suppliersCount} مورد مسجل</p>
        </div>

        {/* Stagnant Frozen Capital */}
        <div
          onClick={() => setActiveTab('stagnant_expiry')}
          className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">أموال في بضاعة راكدة</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-600 font-mono mt-2">{formatCurrency(stats.stagnantCapital, currency)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{stats.stagnantProducts.length} منتج لم يباع منذ مدة</p>
        </div>

        {/* Operational Expenses */}
        <div
          onClick={() => setActiveTab('expenses')}
          className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-gray-700">مصاريف ({stats.periodLabel})</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-purple-600 font-mono mt-2">{formatCurrency(stats.periodExpenses, currency)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">إجمالي كل المصاريف: {formatCurrency(stats.totalExpenses, currency)}</p>
        </div>
      </div>

      {/* Stock Health Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('products')}
          className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-gray-300 shadow-xs"
        >
          <div>
            <p className="text-xs text-gray-500">إجمالي الأصناف</p>
            <p className="text-base font-bold text-gray-800 mt-0.5">{stats.totalProductsCount} صنف</p>
          </div>
          <Package className="w-5 h-5 text-gray-400" />
        </div>

        <div
          onClick={() => setActiveTab('stagnant_expiry')}
          className={`border p-3 rounded-xl flex items-center justify-between cursor-pointer shadow-xs ${
            stats.lowStockCount > 0
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <div>
            <p className="text-xs text-gray-500">منخفض المخزون</p>
            <p className="text-base font-bold text-amber-600 mt-0.5">{stats.lowStockCount} منتج</p>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>

        <div
          onClick={() => setActiveTab('stagnant_expiry')}
          className={`border p-3 rounded-xl flex items-center justify-between cursor-pointer shadow-xs ${
            stats.expiredCount > 0
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          <div>
            <p className="text-xs text-gray-500">منتهي الصلاحية</p>
            <p className="text-base font-bold text-red-600 mt-0.5">{stats.expiredCount} منتج</p>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>

        <div
          onClick={() => setActiveTab('invoices')}
          className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-gray-300 shadow-xs"
        >
          <div>
            <p className="text-xs text-gray-500">فواتير ({stats.periodLabel})</p>
            <p className="text-base font-bold text-gray-800 mt-0.5">{stats.periodInvoicesCount} فاتورة</p>
          </div>
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Main Charts & Category Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trend Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>حركة المبيعات والأرباح ({stats.periodLabel})</span>
              </h3>
              <p className="text-xs text-gray-500">مقارنة حجم المبيعات الإجمالية بصافي الأرباح المحققة</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span className="text-gray-700 font-medium">المبيعات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-700 font-medium">الربح</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, '']}
                />
                <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name="الأرباح" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (1 col) */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>توزيع مبيعات الفئات ({stats.periodLabel})</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">النسبة المئوية لحجم المبيعات حسب الأصناف</p>

          <div className="h-56 w-full flex-1">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${formatCurrency(Number(value) || 0, currency)}`, 'المبيعات']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                لا توجد بيانات مبيعات في هذه الفترة
              </div>
            )}
          </div>

          {/* Pie Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 text-[11px]">
            {categoryPieData.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                <span className="text-gray-700 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Sellers vs Most Profitable Products Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Best Selling */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>أكثر 5 منتجات مبيعاً ({stats.periodLabel})</span>
            </h3>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              عرض تقرير المبيعات
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.topSelling.length > 0 ? (
              stats.topSelling.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-xs font-bold text-blue-700 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.category}</p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-xs font-bold text-blue-600">
                      {p.isScaleItem ? `${p.soldQty} كغ` : `${p.soldQty} ${p.unit === 'piece' ? 'قطعة' : p.unit}`}
                    </p>
                    <p className="text-[10px] text-gray-500">{formatCurrency(p.totalRevenue, currency)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">لم يتم تسجيل عمليات بيع في هذه الفترة</p>
            )}
          </div>
        </div>

        {/* Top 5 Most Profitable Products */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>المنتجات الأكثر ربحية ({stats.periodLabel})</span>
            </h3>
            <button
              onClick={() => setActiveTab('profit_loss')}
              className="text-xs text-emerald-600 hover:underline font-bold"
            >
              تحليل الأرباح
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.mostProfitable.length > 0 ? (
              stats.mostProfitable.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/80 hover:bg-emerald-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500">سعر البيع: {formatCurrency(p.sellingPrice, currency)}</p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="text-xs font-bold text-emerald-600">+{formatCurrency(p.totalProfit, currency)}</p>
                    <p className="text-[10px] text-gray-500">المبيعات: {formatCurrency(p.totalRevenue, currency)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">لا توجد أرباح مسجلة في هذه الفترة</p>
            )}
          </div>
        </div>
      </div>

      {/* Critical Restocking Alerts & Stagnant Quick Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Urgent Items */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span>منتجات قاربت على النفاد (تحتاج إعادة شراء فورية)</span>
            </h3>
            <button
              onClick={() => setActiveTab('purchases')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              إنشاء فاتورة توريد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2.5 font-bold">المنتج</th>
                  <th className="p-2.5 font-bold">المخزون المتبقي</th>
                  <th className="p-2.5 font-bold">الحد الأدنى</th>
                  <th className="p-2.5 font-bold">المورد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.slice(0, 4).map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-2.5 font-bold text-gray-800">{p.name}</td>
                      <td className="p-2.5 font-bold text-rose-600">
                        {p.stockQuantity} {p.unit}
                      </td>
                      <td className="p-2.5 text-gray-500">{p.minStockAlert}</td>
                      <td className="p-2.5 text-gray-700 truncate max-w-[120px]">{p.supplierName || 'غير محدد'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      جميع المنتجات بحالة ممتازة ومخزونها كافي!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stagnant Slow Stock */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>المنتجات الراكدة (تجميد السيولة في المخزن)</span>
            </h3>
            <button
              onClick={() => setActiveTab('stagnant_expiry')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              عرض قائمة الراكد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2.5 font-bold">المنتج</th>
                  <th className="p-2.5 font-bold">الكمية الراكدة</th>
                  <th className="p-2.5 font-bold">قيمة التكلفة المجمدة</th>
                  <th className="p-2.5 font-bold">آخر بيع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.stagnantProducts.length > 0 ? (
                  stats.stagnantProducts.slice(0, 4).map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-2.5 font-bold text-gray-800">{p.name}</td>
                      <td className="p-2.5 font-bold text-amber-600">
                        {p.stockQuantity} {p.unit}
                      </td>
                      <td className="p-2.5 font-bold text-gray-800">
                        {formatCurrency(p.costPrice * p.stockQuantity, currency)}
                      </td>
                      <td className="p-2.5 text-gray-500">{p.lastSaleDate || 'لم يباع بعد'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      لا توجد بضائع راكدة حالياً، حركة المبيعات نشطة!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
