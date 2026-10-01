import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Printer,
  Eye,
  CreditCard,
  Banknote,
  DollarSign,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  X,
  Filter,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { formatCurrency, isDateInPeriod, PeriodFilter } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';

export const InvoicesArchiveView: React.FC = () => {
  const { settings, refreshTrigger, triggerRefresh, playSuccessSound, currentUser } = useApp();
  const currency = settings.storeCurrency || 'د.ج';
  const canViewProfits = currentUser?.role === 'admin' || currentUser?.permissions?.canViewProfits !== false;
  const canDeleteSales = currentUser?.role === 'admin' || currentUser?.permissions?.canDeleteSales !== false;

  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<PeriodFilter>('all');

  // Selected Sale for Details & Printing
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const list = await db.sales.reverse().toArray();
      setSales(list);
    }
    load();
  }, [refreshTrigger]);

  const handlePrintReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptModalOpen(true);
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!canDeleteSales) {
      alert('ليس لديك صلاحية لحذف أو إلغاء فواتير البيع');
      return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء وحذف الفاتورة #${sale.invoiceNumber}؟ سيتم استرجاع الكميات المباعة إلى المخزون تلقائياً.`)) {
      return;
    }

    try {
      // 1. Restore product stock quantities
      for (const item of sale.items) {
        if (item.productId) {
          const prod = await db.products.get(item.productId);
          if (prod) {
            await db.products.update(item.productId, {
              stockQuantity: prod.stockQuantity + item.quantity,
            });
          }
        }
      }

      // 2. Adjust customer debt if credit was registered
      if (sale.customerId && sale.remainingDebt > 0) {
        const cust = await db.customers.get(sale.customerId);
        if (cust) {
          await db.customers.update(sale.customerId, {
            totalDebt: Math.max(0, cust.totalDebt - sale.remainingDebt),
            totalSpent: Math.max(0, cust.totalSpent - sale.totalAmount),
          });
        }
      }

      // 3. Delete sale record
      if (sale.id) {
        await db.sales.delete(sale.id);
      }

      playSuccessSound();
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting sale:', err);
      alert('حدث خطأ أثناء إلغاء الفاتورة');
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Payment filter
      if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false;
      // Date filter (اليوم / الأسبوع / الشهر / السنة / الكل)
      if (dateFilter !== 'all' && !isDateInPeriod(s.date, dateFilter)) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = s.invoiceNumber.toLowerCase().includes(q);
        const matchCust = (s.customerName || '').toLowerCase().includes(q);
        const matchCashier = (s.cashierName || '').toLowerCase().includes(q);
        if (!matchInv && !matchCust && !matchCashier) return false;
      }
      return true;
    });
  }, [sales, paymentFilter, dateFilter, searchQuery]);

  // Totals
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSales]);

  const totalProfits = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  }, [filteredSales]);

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
      'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقداً' : s.paymentMethod === 'credit' ? 'آجل (دين)' : 'دفع جزئي',
      'صافي الربح': s.profit || 0,
      'الكاشير': s.cashierName,
      'العملة': currency,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'أرشيف الفواتير');
    XLSX.writeFile(wb, `ارشيف_الفواتير_${new Date().toISOString().slice(0, 10)}.xlsx`);
    playSuccessSound();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">أرشيف الفواتير وسجل المبيعات</h1>
            <p className="text-xs text-gray-500">سجل كامل لكافة الفواتير الصادرة مع إمكانية استعراضها وإعادة طباعتها</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">عدد الفواتير المعروضة</span>
          <p className="text-xl font-extrabold text-gray-900 font-mono mt-1">{filteredSales.length} فاتورة</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">إجمالي قيمة الفواتير</span>
          <p className="text-xl font-extrabold text-blue-600 font-mono mt-1">{formatCurrency(totalRevenue, currency)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">صافي الأرباح المحققة</span>
          {canViewProfits ? (
            <p className="text-xl font-extrabold text-emerald-600 font-mono mt-1">{formatCurrency(totalProfits, currency)}</p>
          ) : (
            <p className="text-sm font-bold text-amber-600 font-mono mt-2">🔒 محجوب بصلاحيات المدير</p>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة، اسم الزبون، أو الكاشير..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">كافة طرق الدفع</option>
            <option value="cash">نقداً فقط (Cash)</option>
            <option value="credit">آجل / دين (Credit)</option>
            <option value="partial">دفع جزئي</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as PeriodFilter)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">كل الفترات (الكل)</option>
            <option value="today">فواتير اليوم</option>
            <option value="week">فواتير هذا الأسبوع</option>
            <option value="month">فواتير هذا الشهر</option>
            <option value="year">فواتير هذه السنة</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 font-bold">
                <th className="p-3">رقم الفاتورة</th>
                <th className="p-3 text-center">التاريخ والوقت</th>
                <th className="p-3">الزبون</th>
                <th className="p-3 text-center">الأصناف</th>
                <th className="p-3 text-left">الإجمالي</th>
                <th className="p-3 text-left">المدفوع</th>
                <th className="p-3 text-left">المتبقي (دين)</th>
                <th className="p-3 text-center">طريقة الدفع</th>
                <th className="p-3 text-left">الربح</th>
                <th className="p-3 text-center w-28 no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id || sale.invoiceNumber} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">#{sale.invoiceNumber}</td>
                    <td className="p-3 text-center font-mono text-gray-600 text-[11px]">
                      {sale.date} <span className="text-gray-400">{sale.time}</span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">{sale.customerName}</td>
                    <td className="p-3 text-center font-mono text-gray-700 font-semibold">{sale.items.length} صنف</td>
                    <td className="p-3 text-left font-mono font-bold text-gray-900">
                      {formatCurrency(sale.totalAmount, currency)}
                    </td>
                    <td className="p-3 text-left font-mono text-emerald-700">
                      {formatCurrency(sale.paidAmount, currency)}
                    </td>
                    <td className="p-3 text-left font-mono">
                      {sale.remainingDebt > 0 ? (
                        <span className="font-bold text-red-600">{formatCurrency(sale.remainingDebt, currency)}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.paymentMethod === 'cash'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sale.paymentMethod === 'credit'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sale.paymentMethod === 'cash'
                          ? 'نقداً'
                          : sale.paymentMethod === 'credit'
                          ? 'آجل (دين)'
                          : 'دفع جزئي'}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-600">
                      {canViewProfits ? formatCurrency(sale.profit || 0, currency) : '••••'}
                    </td>
                    <td className="p-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(sale)}
                          className="p-1 rounded hover:bg-gray-100 text-blue-600"
                          title="عرض تفاصيل الأصناف"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(sale)}
                          className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
                          title="إعادة طباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canDeleteSales && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSale(sale)}
                            className="p-1 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                            title="إلغاء وحذف الفاتورة واسترجاع المخزون"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    لا توجد فواتير مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {isDetailsModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  تفاصيل الفاتورة #{selectedSale.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 block">الزبون:</span>
                <span className="font-bold text-gray-800">{selectedSale.customerName}</span>
              </div>
              <div>
                <span className="text-gray-400 block">التاريخ والوقت:</span>
                <span className="font-mono text-gray-800">{selectedSale.date} {selectedSale.time}</span>
              </div>
              <div>
                <span className="text-gray-400 block">الكاشير:</span>
                <span className="font-bold text-gray-800">{selectedSale.cashierName}</span>
              </div>
              <div>
                <span className="text-gray-400 block">طريقة الدفع:</span>
                <span className="font-bold text-gray-800">
                  {selectedSale.paymentMethod === 'cash' ? 'نقداً' : selectedSale.paymentMethod === 'credit' ? 'آجل' : 'جزئي'}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700">الأصناف المشتراة ({selectedSale.items.length}):</span>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-gray-100 text-gray-600 font-bold">
                    <tr>
                      <th className="p-2">المنتج</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-left">السعر</th>
                      <th className="p-2 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedSale.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2 font-semibold text-gray-800">{item.productName}</td>
                        <td className="p-2 text-center font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2 text-left font-mono">{formatCurrency(item.unitPrice, currency)}</td>
                        <td className="p-2 text-left font-mono font-bold text-gray-900">
                          {formatCurrency(item.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-mono font-bold text-gray-800">{formatCurrency(selectedSale.subtotal, currency)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono font-bold">-{formatCurrency(selectedSale.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-blue-900 pt-1 border-t border-blue-200">
                <span>المبلغ الإجمالي:</span>
                <span className="font-mono">{formatCurrency(selectedSale.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>المدفوع:</span>
                <span className="font-mono">{formatCurrency(selectedSale.paidAmount, currency)}</span>
              </div>
              {selectedSale.remainingDebt > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>المتبقي في ذمة الزبون (دين):</span>
                  <span className="font-mono">{formatCurrency(selectedSale.remainingDebt, currency)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setIsReceiptModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة إيصال الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && selectedSale && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          sale={selectedSale}
          settings={settings}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}
    </div>
  );
};
