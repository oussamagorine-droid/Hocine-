import React, { useEffect, useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  User,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  X,
  Printer,
  History,
  AlertCircle,
  FileText,
  Phone,
} from 'lucide-react';
import { db, recordDebtPayment } from '../db/db';
import { useApp } from '../context/AppContext';
import { Customer, CustomerPayment, Supplier, SupplierPayment } from '../types';
import { formatCurrency } from '../utils/formatters';

export const DebtsView: React.FC = () => {
  const { settings, triggerRefresh, refreshTrigger, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Settlement Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<{ id: number; name: string; currentDebt: number; type: 'customer' | 'supplier' } | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('');

  // Statement / Ledger Modal
  const [statementEntity, setStatementEntity] = useState<{ id: number; name: string; phone?: string; type: 'customer' | 'supplier'; currentDebt: number } | null>(null);
  const [entityPayments, setEntityPayments] = useState<Array<CustomerPayment | SupplierPayment>>([]);

  useEffect(() => {
    async function load() {
      const [c, s, cp, sp] = await Promise.all([
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.customerPayments.reverse().toArray(),
        db.supplierPayments.reverse().toArray(),
      ]);
      setCustomers(c);
      setSuppliers(s);
      setCustomerPayments(cp);
      setSupplierPayments(sp);
    }
    load();
  }, [refreshTrigger]);

  // Overall KPI debt totals
  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  }, [customers]);

  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);
  }, [suppliers]);

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
      return matchesSearch;
    });
  }, [customers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.company && s.company.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [suppliers, searchQuery]);

  // Open Payment Modal
  const openPaymentModal = (id: number, name: string, currentDebt: number, type: 'customer' | 'supplier') => {
    setSelectedEntity({ id, name, currentDebt, type });
    setPayAmount(currentDebt);
    setPayNotes(type === 'customer' ? 'تسديد دفعة من الحساب' : 'تسديد دفعة للمورد');
    setIsPayModalOpen(true);
  };

  // Open Account Statement Modal
  const openStatementModal = async (id: number, name: string, phone: string | undefined, type: 'customer' | 'supplier', currentDebt: number) => {
    setStatementEntity({ id, name, phone, type, currentDebt });
    if (type === 'customer') {
      const logs = await db.customerPayments.where('customerId').equals(id).reverse().toArray();
      setEntityPayments(logs);
    } else {
      const logs = await db.supplierPayments.where('supplierId').equals(id).reverse().toArray();
      setEntityPayments(logs);
    }
  };

  // Submit Payment Settlement
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || payAmount <= 0) {
      alert('يرجى تحديد مبلغ التسديد بشكل صحيح');
      return;
    }

    try {
      await recordDebtPayment(
        selectedEntity.type,
        selectedEntity.id,
        selectedEntity.name,
        payAmount,
        payNotes.trim()
      );
      playSuccessSound();
      triggerRefresh();
      setIsPayModalOpen(false);
    } catch (err) {
      console.error('Error recording debt payment:', err);
      alert('حدث خطأ أثناء حفظ عملية التسديد');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>دفتر الديون والحسابات الآجلة (الكريدي)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            متابعة ديون الزبائن للمحل، والتزامات المحل للموردين، وتسجيل الدفعات والتسويات
          </p>
        </div>
      </div>

      {/* KPI Cards: Total Debts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500">إجمالي ديون الزبائن (مستحقات للمحل):</p>
            <h2 className="text-xl font-bold text-rose-600">{formatCurrency(totalCustomerDebt, currency)}</h2>
            <p className="text-[11px] text-gray-400">
              {customers.filter((c) => c.totalDebt > 0).length} زبون عليهم مبالغ مؤجلة
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500">مستحقات الموردين (ديون على المحل):</p>
            <h2 className="text-xl font-bold text-amber-600">{formatCurrency(totalSupplierDebt, currency)}</h2>
            <p className="text-[11px] text-gray-400">
              {suppliers.filter((s) => s.totalDebt > 0).length} مورد بانتظار السداد
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {/* Sub Navigation & Search Bar */}
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'customers' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ديون الزبائن ({customers.filter((c) => c.totalDebt > 0).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'suppliers' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>ديون الموردين ({suppliers.filter((s) => s.totalDebt > 0).length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-lg pr-9 pl-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* CUSTOMERS DEBT TABLE */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                <tr>
                  <th className="p-3">الزبون</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">إجمالي المشتريات</th>
                  <th className="p-3">المسدد نقداً</th>
                  <th className="p-3">الدين الحالي (كريدي)</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-bold text-gray-900">{c.name}</td>
                    <td className="p-3 font-mono text-gray-600">{c.phone}</td>
                    <td className="p-3 text-gray-700">{formatCurrency(c.totalSpent, currency)}</td>
                    <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(c.totalPaid, currency)}</td>
                    <td className="p-3 font-bold text-rose-600">
                      {c.totalDebt > 0 ? formatCurrency(c.totalDebt, currency) : (
                        <span className="text-emerald-600 text-xs font-semibold">خالص (0)</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openStatementModal(c.id!, c.name, c.phone, 'customer', c.totalDebt)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1 text-[11px] border border-gray-200 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>كشف الحساب</span>
                        </button>

                        <button
                          onClick={() => openPaymentModal(c.id!, c.name, c.totalDebt, 'customer')}
                          disabled={c.totalDebt <= 0}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold flex items-center gap-1 text-[11px] transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تسديد دفعة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUPPLIERS DEBT TABLE */}
        {activeTab === 'suppliers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                <tr>
                  <th className="p-3">المورد / الشركة</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">إجمالي التوريدات</th>
                  <th className="p-3">المسدد للمورد</th>
                  <th className="p-3">مستحقات المورد (دين)</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-gray-900">{s.name}</p>
                      {s.company && <p className="text-[11px] text-gray-400">{s.company}</p>}
                    </td>
                    <td className="p-3 font-mono text-gray-600">{s.phone}</td>
                    <td className="p-3 text-gray-700">{formatCurrency(s.totalPurchases, currency)}</td>
                    <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(s.totalPaid, currency)}</td>
                    <td className="p-3 font-bold text-amber-600">
                      {s.totalDebt > 0 ? formatCurrency(s.totalDebt, currency) : (
                        <span className="text-emerald-600 text-xs font-semibold">خالص (0)</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openStatementModal(s.id!, s.name, s.phone, 'supplier', s.totalDebt)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1 text-[11px] border border-gray-200 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>كشف الحساب</span>
                        </button>

                        <button
                          onClick={() => openPaymentModal(s.id!, s.name, s.totalDebt, 'supplier')}
                          disabled={s.totalDebt <= 0}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold flex items-center gap-1 text-[11px] transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تسديد للمورد</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. DEBT PAYMENT SETTLEMENT MODAL */}
      {isPayModalOpen && selectedEntity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePayment}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {selectedEntity.type === 'customer'
                  ? `تسجيل دفعة من حساب الزبون: ${selectedEntity.name}`
                  : `تسديد دفعة للمورد: ${selectedEntity.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>إجمالي الرصيد المدين الحالي:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatCurrency(selectedEntity.currentDebt, currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">المبلغ المدفوع / المسدد *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedEntity.currentDebt}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 text-emerald-700 font-mono text-xl font-bold rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 mb-1 block">ملاحظات أو رقم الوصل:</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
                <span className="text-gray-600">الرصيد المتبقي بعد هذه الدفعة:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(Math.max(0, selectedEntity.currentDebt - payAmount), currency)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
              >
                تأكيد وحفظ الدفعة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. ACCOUNT STATEMENT & PAYMENT HISTORY MODAL */}
      {statementEntity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in max-h-[85vh] flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>كشف حساب: {statementEntity.name}</span>
                </h3>
                {statementEntity.phone && (
                  <p className="text-[11px] text-gray-500 mt-0.5">هاتف: {statementEntity.phone}</p>
                )}
              </div>
              <button
                onClick={() => setStatementEntity(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 text-xs space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-700">الرصيد المتبقي بذمته حالياً:</span>
                <span className="font-bold text-rose-600 text-base">
                  {formatCurrency(statementEntity.currentDebt, currency)}
                </span>
              </div>

              <h4 className="font-bold text-gray-800 pt-2">سجل الدفعات والتسديدات المسجلة:</h4>
              <div className="space-y-2">
                {entityPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{p.notes || 'تسديد دفعة'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        التاريخ: {p.date} | وصل #{p.receiptNumber}
                      </p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-mono font-bold text-emerald-600">
                        +{formatCurrency(p.amount, currency)}
                      </p>
                    </div>
                  </div>
                ))}

                {entityPayments.length === 0 && (
                  <p className="text-center py-6 text-gray-400">لا توجد تسديدات مسجلة لهذا الحساب بعد</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 font-bold flex items-center gap-1.5 border border-gray-200 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>طباعة الكشف</span>
              </button>

              <button
                onClick={() => setStatementEntity(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
