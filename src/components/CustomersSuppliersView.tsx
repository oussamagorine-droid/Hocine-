import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Building,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Customer, Supplier } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CustomersSuppliersViewProps {
  initialTab?: 'customers' | 'suppliers';
}

export const CustomersSuppliersView: React.FC<CustomersSuppliersViewProps> = ({ initialTab = 'customers' }) => {
  const { settings, triggerRefresh, refreshTrigger } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Customer Form Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custNotes, setCustNotes] = useState<string>('');

  // Supplier Form Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState<string>('');
  const [supCompany, setSupCompany] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supNotes, setSupNotes] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [c, s] = await Promise.all([db.customers.toArray(), db.suppliers.toArray()]);
      setCustomers(c);
      setSuppliers(s);
    }
    load();
  }, [refreshTrigger]);

  // Open Customer Modal
  const openCustomerModal = (c?: Customer) => {
    if (c) {
      setEditingCustomer(c);
      setCustName(c.name);
      setCustPhone(c.phone);
      setCustAddress(c.address || '');
      setCustNotes(c.notes || '');
    } else {
      setEditingCustomer(null);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustNotes('');
    }
    setIsCustomerModalOpen(true);
  };

  // Open Supplier Modal
  const openSupplierModal = (s?: Supplier) => {
    if (s) {
      setEditingSupplier(s);
      setSupName(s.name);
      setSupCompany(s.company);
      setSupPhone(s.phone);
      setSupAddress(s.address || '');
      setSupNotes(s.notes || '');
    } else {
      setEditingSupplier(null);
      setSupName('');
      setSupCompany('');
      setSupPhone('');
      setSupAddress('');
      setSupNotes('');
    }
    setIsSupplierModalOpen(true);
  };

  // Save Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      alert('يرجى كتابة الاسم ورقم الهاتف');
      return;
    }

    if (editingCustomer?.id) {
      await db.customers.update(editingCustomer.id, {
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        notes: custNotes.trim(),
      });
    } else {
      await db.customers.add({
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        notes: custNotes.trim(),
        totalSpent: 0,
        totalDebt: 0,
        totalPaid: 0,
        createdAt: new Date().toISOString(),
      });
    }

    setIsCustomerModalOpen(false);
    triggerRefresh();
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      alert('يرجى كتابة اسم المورد ورقم الهاتف');
      return;
    }

    if (editingSupplier?.id) {
      await db.suppliers.update(editingSupplier.id, {
        name: supName.trim(),
        company: supCompany.trim(),
        phone: supPhone.trim(),
        address: supAddress.trim(),
        notes: supNotes.trim(),
      });
    } else {
      await db.suppliers.add({
        name: supName.trim(),
        company: supCompany.trim(),
        phone: supPhone.trim(),
        address: supAddress.trim(),
        notes: supNotes.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        totalDebt: 0,
        createdAt: new Date().toISOString(),
      });
    }

    setIsSupplierModalOpen(false);
    triggerRefresh();
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: number, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الزبون "${name}"؟`)) {
      await db.customers.delete(id);
      triggerRefresh();
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (id: number, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المورد "${name}"؟`)) {
      await db.suppliers.delete(id);
      triggerRefresh();
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.company.toLowerCase().includes(q) || s.phone.includes(q)
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>دليل جهات الاتصال: الزبائن والموردين</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            إدارة بيانات العملاء، شركات التوريد، أرقام الهواتف والعناوين
          </p>
        </div>

        <button
          onClick={() => (activeTab === 'customers' ? openCustomerModal() : openSupplierModal())}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'customers' ? '+ إضافة زبون جديد' : '+ إضافة مورد جديد'}</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'customers' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>دليل الزبائن ({customers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'suppliers' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>دليل الموردين ({suppliers.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف..."
              className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 pr-9 pl-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* CUSTOMERS CARDS GRID */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-lg bg-white border border-gray-200 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-colors text-xs shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{c.name}</h4>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="font-mono">{c.phone}</span>
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        c.totalDebt > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {c.totalDebt > 0 ? `دين: ${formatCurrency(c.totalDebt, currency)}` : 'خالص'}
                    </span>
                  </div>

                  {c.address && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-2">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    مشتريات: <strong className="text-gray-800">{formatCurrency(c.totalSpent, currency)}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openCustomerModal(c)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(c.id!, c.name)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SUPPLIERS CARDS GRID */}
        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSuppliers.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-lg bg-white border border-gray-200 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-colors text-xs shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                      <p className="text-[11px] text-blue-600 font-semibold">{s.company}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        s.totalDebt > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {s.totalDebt > 0 ? `مستحق: ${formatCurrency(s.totalDebt, currency)}` : 'خالص'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="font-mono">{s.phone}</span>
                  </p>

                  {s.address && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    توريدات: <strong className="text-gray-800">{formatCurrency(s.totalPurchases, currency)}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openSupplierModal(s)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(s.id!, s.name)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {editingCustomer ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 mb-1 block">اسم الزبون *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600 mb-1 block">العنوان:</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600 mb-1 block">ملاحظات:</label>
                <input
                  type="text"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 mb-1 block">اسم المسؤول / المندوب *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">اسم الشركة / المؤسسة *</label>
                <input
                  type="text"
                  required
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-600 mb-1 block">العنوان / المنطقة:</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
