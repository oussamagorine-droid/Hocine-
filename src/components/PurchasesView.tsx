import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  UserCheck,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { db, executePurchaseTransaction } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, Purchase, PurchaseItem, Supplier } from '../types';
import { formatCurrency, generateInvoiceNumber, getLocalDateStr, isDateInPeriod, PeriodFilter } from '../utils/formatters';

export const PurchasesView: React.FC = () => {
  const { settings, triggerRefresh, refreshTrigger, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<PeriodFilter>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  // New Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [invoiceReference, setInvoiceReference] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(getLocalDateStr());
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit' | 'partial'>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Invoice Items in draft
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Item Picker draft row
  const [draftProductId, setDraftProductId] = useState<number | undefined>(undefined);
  const [draftQty, setDraftQty] = useState<number>(10);
  const [draftUnitCost, setDraftUnitCost] = useState<number>(100);
  const [draftSellingPrice, setDraftSellingPrice] = useState<number>(130);

  // Load Data
  useEffect(() => {
    async function load() {
      const [pur, sup, prod] = await Promise.all([
        db.purchases.reverse().toArray(),
        db.suppliers.toArray(),
        db.products.toArray(),
      ]);
      setPurchases(pur);
      setSuppliers(sup);
      setProducts(prod);
      if (sup.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sup[0].id);
      }
    }
    load();
  }, [refreshTrigger]);

  // When selected draft product changes, sync its default cost and price
  useEffect(() => {
    if (draftProductId) {
      const p = products.find((prod) => prod.id === draftProductId);
      if (p) {
        setDraftUnitCost(p.costPrice);
        setDraftSellingPrice(p.sellingPrice);
      }
    }
  }, [draftProductId, products]);

  // Calculations for current draft invoice
  const draftTotalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.total, 0);
  }, [items]);

  const draftRemainingDebt = useMemo(() => {
    if (paymentStatus === 'paid') return 0;
    if (paymentStatus === 'credit') return draftTotalAmount;
    return Math.max(0, draftTotalAmount - paidAmount);
  }, [paymentStatus, draftTotalAmount, paidAmount]);

  // Add Item to draft invoice
  const handleAddItem = () => {
    if (!draftProductId || draftQty <= 0 || draftUnitCost <= 0) {
      alert('يرجى اختيار المنتج وتحديد الكمية وسعر الشراء');
      return;
    }

    const p = products.find((prod) => prod.id === draftProductId);
    if (!p) return;

    const total = Math.round(draftQty * draftUnitCost * 100) / 100;

    setItems((prev) => [
      ...prev,
      {
        productId: p.id!,
        productName: p.name,
        quantity: draftQty,
        unitCost: draftUnitCost,
        total,
        newSellingPrice: draftSellingPrice > 0 ? draftSellingPrice : undefined,
      },
    ]);

    setDraftProductId(undefined);
    setDraftQty(10);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Open New Invoice Modal
  const openNewInvoiceModal = () => {
    setItems([]);
    setInvoiceReference('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('paid');
    setPaidAmount(0);
    setNotes('');
    setIsModalOpen(true);
  };

  // Submit & Save Purchase Invoice Transaction
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('يرجى تحديد المورد');
      return;
    }
    if (items.length === 0) {
      alert('يجب إضافة منتج واحد على الأقل في الفاتورة');
      return;
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const invoiceNumber = invoiceReference.trim() || generateInvoiceNumber('PUR');

    const calculatedPaid =
      paymentStatus === 'paid'
        ? draftTotalAmount
        : paymentStatus === 'credit'
        ? 0
        : paidAmount;

    const payload: Omit<Purchase, 'id'> = {
      invoiceNumber,
      supplierId: selectedSupplierId,
      supplierName: sup?.name || 'مورد عام',
      date: invoiceDate,
      totalCost: draftTotalAmount,
      paidAmount: calculatedPaid,
      remainingDebt: draftRemainingDebt,
      items,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await executePurchaseTransaction(payload);
      playSuccessSound();
      triggerRefresh();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving purchase invoice:', err);
      alert('حدث خطأ أثناء حفظ فاتورة المشتريات');
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter((inv) => {
      if (supplierFilter !== 'all' && inv.supplierId?.toString() !== supplierFilter) return false;
      if (dateFilter !== 'all' && !isDateInPeriod(inv.date, dateFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchSup = (inv.supplierName || '').toLowerCase().includes(q);
        if (!matchInv && !matchSup) return false;
      }
      return true;
    });
  }, [purchases, supplierFilter, dateFilter, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]" dir="rtl">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>إدارة فواتير المشتريات وتوريد البضائع</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md font-bold border border-gray-200">
              {filteredPurchases.length} فاتورة
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            تسجيل شحنات الموردين، زيادة المخزون تلقائياً، وتحديث أسعار الشراء والديون
          </p>
        </div>

        <button
          onClick={openNewInvoiceModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ تسجيل فاتورة توريد جديدة</span>
        </button>
      </div>

      {/* Search & Period Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">كافة الموردين</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id?.toString()}>
                {s.name}
              </option>
            ))}
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

      {/* Invoices List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800">سجل فواتير المشتريات المعروضة</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
              <tr>
                <th className="p-3">رقم الفاتورة</th>
                <th className="p-3">المورد</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">عدد الأصناف</th>
                <th className="p-3">المبلغ الإجمالي</th>
                <th className="p-3">المسدد</th>
                <th className="p-3">المتبقي (دين)</th>
                <th className="p-3">حالة السداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.map((inv) => (
                <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-gray-800">{inv.invoiceNumber}</td>
                  <td className="p-3 font-bold text-gray-900">{inv.supplierName}</td>
                  <td className="p-3 text-gray-500">{inv.date}</td>
                  <td className="p-3 text-gray-600">{inv.items.length} أصناف</td>
                  <td className="p-3 font-bold text-gray-900">{formatCurrency(inv.totalCost, currency)}</td>
                  <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(inv.paidAmount, currency)}</td>
                  <td className="p-3 font-bold text-rose-600">
                    {inv.remainingDebt > 0 ? formatCurrency(inv.remainingDebt, currency) : '-'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        inv.remainingDebt === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.paidAmount === 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {inv.remainingDebt === 0 ? 'مدفوعة بالكامل' : inv.paidAmount === 0 ? 'آجلة (دين)' : 'دفع جزئي'}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    لم يتم العثور على فواتير مشتريات مطابقة للفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NEW PURCHASE INVOICE MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveInvoice}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-3xl overflow-hidden shadow-xl animate-in fade-in max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>تسجيل فاتورة شراء جديدة وتوريد بضائع</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Top Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">المورد *</label>
                  <select
                    value={selectedSupplierId || ''}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (دينه: {s.totalDebt} {currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">رقم فاتورة المورد (اختياري)</label>
                  <input
                    type="text"
                    value={invoiceReference}
                    onChange={(e) => setInvoiceReference(e.target.value)}
                    placeholder="رقم الفاتورة الورقية..."
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">تاريخ الفاتورة *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Add Item Form Row */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="font-bold text-blue-600">إضافة بضاعة إلى الفاتورة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-gray-600 mb-1 block">المنتج</label>
                    <select
                      value={draftProductId || ''}
                      onChange={(e) => setDraftProductId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- اختر المنتج --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (المخزون الحالي: {p.stockQuantity} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-600 mb-1 block">الكمية المشتراة</label>
                    <input
                      type="number"
                      min="0.1"
                      value={draftQty}
                      onChange={(e) => setDraftQty(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-600 mb-1 block">سعر شراء الوحدة</label>
                    <input
                      type="number"
                      min="0"
                      value={draftUnitCost}
                      onChange={(e) => setDraftUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold text-center"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      + إضافة للجدول
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                    <tr>
                      <th className="p-2.5">المنتج</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-center">سعر الشراء</th>
                      <th className="p-2.5 text-left">الإجمالي</th>
                      <th className="p-2.5 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20">
                        <td className="p-2.5 font-bold text-gray-800">{it.productName}</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">{it.quantity}</td>
                        <td className="p-2.5 text-center text-gray-600">{formatCurrency(it.unitCost, currency)}</td>
                        <td className="p-2.5 text-left font-bold text-gray-900">{formatCurrency(it.total, currency)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-400">
                          لم يتم إضافة أي منتج بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">إجمالي فاتورة الشراء:</span>
                  <span className="text-lg font-black text-blue-600">{formatCurrency(draftTotalAmount, currency)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                  <div>
                    <label className="font-bold text-gray-700 mb-1 block">طريقة السداد للمورد:</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => {
                        const s = e.target.value as any;
                        setPaymentStatus(s);
                        if (s === 'paid') setPaidAmount(draftTotalAmount);
                        if (s === 'credit') setPaidAmount(0);
                        if (s === 'partial') setPaidAmount(Math.round(draftTotalAmount / 2));
                      }}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="paid">مسددة نقداً بالكامل</option>
                      <option value="credit">آجلة (دين على المحل)</option>
                      <option value="partial">دفع جزء والباقي دين</option>
                    </select>
                  </div>

                  {paymentStatus === 'partial' && (
                    <div>
                      <label className="font-bold text-gray-700 mb-1 block">المبلغ المدفوع للمورد:</label>
                      <input
                        type="number"
                        min="0"
                        max={draftTotalAmount}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                        className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs focus:outline-none font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-rose-600 mb-1 block">المبلغ المتبقي كدين للمورد:</label>
                    <div className="p-2 rounded-lg bg-white border border-gray-200 font-bold text-rose-600">
                      {formatCurrency(draftRemainingDebt, currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
              >
                حفظ الفاتورة وتحديث المخزون
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
