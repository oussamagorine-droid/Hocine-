import React, { useEffect, useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  FileSpreadsheet,
  Printer,
  DollarSign,
  TrendingDown,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, getLocalDateStr, isDateInPeriod, PeriodFilter } from '../utils/formatters';

const CATEGORY_NAMES: Record<ExpenseCategory, string> = {
  rent: 'إيجار المحل',
  salaries: 'رواتب وعمالة',
  electricity: 'فاتورة الكهرباء',
  water: 'فاتورة المياه',
  transport: 'نقل وشحن بضائع',
  packaging: 'أكياس ومواد تغليف',
  maintenance: 'صيانة ومعدات',
  taxes: 'ضرائب ورسوم',
  other: 'مصاريف عامة ونثريات',
};

export const ExpensesView: React.FC = () => {
  const { settings, refreshTrigger, triggerRefresh, playSuccessSound } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<PeriodFilter>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateStr());
  const [paidBy, setPaidBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Delete Confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    async function load() {
      const list = await db.expenses.reverse().toArray();
      setExpenses(list);
    }
    load();
  }, [refreshTrigger]);

  const openAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('other');
    setAmount('');
    setDate(getLocalDateStr());
    setPaidBy('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setDate(exp.date);
    setPaidBy(exp.paidBy || '');
    setNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    const payload: Expense = {
      title: title.trim(),
      category,
      categoryNameAr: CATEGORY_NAMES[category] || 'أخرى',
      amount: numAmount,
      date: date || getLocalDateStr(),
      paidBy: paidBy.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString(),
    };

    if (editingExpense?.id) {
      await db.expenses.update(editingExpense.id, payload);
    } else {
      await db.expenses.add(payload);
    }

    playSuccessSound();
    triggerRefresh();
    setIsModalOpen(false);
  };

  const executeDelete = async () => {
    if (!expenseToDelete?.id) return;
    await db.expenses.delete(expenseToDelete.id);
    setExpenseToDelete(null);
    triggerRefresh();
  };

  // Filtered list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Category
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      // Date filter (اليوم / الأسبوع / الشهر / السنة / الكل)
      if (dateFilter !== 'all' && !isDateInPeriod(e.date, dateFilter)) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchCat = e.categoryNameAr.toLowerCase().includes(q);
        const matchPaid = (e.paidBy || '').toLowerCase().includes(q);
        const matchNotes = (e.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchPaid && !matchNotes) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, dateFilter, searchQuery]);

  // Totals
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const thisMonthTotal = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date, 'month')).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const todayTotal = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date, 'today')).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const handleExportExcel = () => {
    const rows = filteredExpenses.map((e, idx) => ({
      '#': idx + 1,
      'عنوان المصروف': e.title,
      'التصنيف': e.categoryNameAr,
      'المبلغ': e.amount,
      'العملة': currency,
      'التاريخ': e.date,
      'صرف بواسطة': e.paidBy || '-',
      'ملاحظات': e.notes || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'سجل المصاريف');
    XLSX.writeFile(wb, `سجل_المصاريف_${new Date().toISOString().slice(0, 10)}.xlsx`);
    playSuccessSound();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900">إدارة المصاريف اليومية والتشغيلية</h1>
            <p className="text-xs text-gray-500">تسجيل وتوثيق نفقات المحل (إيجار، كهرباء، عمالة، شحن، صيانة)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">مصاريف اليوم</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono mt-1">{formatCurrency(todayTotal, currency)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">مصاريف الشهر الحالي</span>
          <p className="text-xl font-extrabold text-gray-900 font-mono mt-1">{formatCurrency(thisMonthTotal, currency)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-bold text-gray-500">إجمالي المصاريف المعروضة</span>
          <p className="text-xl font-extrabold text-red-600 font-mono mt-1">{formatCurrency(totalAmount, currency)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في سندات الصرف أو البيان أو المسؤول..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">كافة الفئات</option>
            {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as PeriodFilter)}
            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">كل الفترات (الكل)</option>
            <option value="today">مصاريف اليوم</option>
            <option value="week">مصاريف هذا الأسبوع</option>
            <option value="month">مصاريف هذا الشهر</option>
            <option value="year">مصاريف هذه السنة</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-600 font-bold">
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">بيان المصروف</th>
                <th className="p-3">الفئة</th>
                <th className="p-3 text-left">المبلغ</th>
                <th className="p-3 text-center">التاريخ</th>
                <th className="p-3">الدافع / المستلم</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3 text-center w-20 no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-gray-900">{exp.title}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                        {exp.categoryNameAr}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-red-600">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-600">{exp.date}</td>
                    <td className="p-3 text-gray-700">{exp.paidBy || '-'}</td>
                    <td className="p-3 text-gray-500 text-[11px] truncate max-w-[150px]">{exp.notes || '-'}</td>
                    <td className="p-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(exp)}
                          className="p-1 rounded hover:bg-gray-100 text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    لا توجد مصاريف مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {editingExpense ? 'تعديل سند الصرف' : 'تسجيل مصروف تشغيلي جديد'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">بيان المصروف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فاتورة كهرباء شهر ماي، إيجار المحل..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المبلغ المطلوب *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">فئة المصروف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
                  >
                    {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">صرف بواسطة / المسؤول</label>
                  <input
                    type="text"
                    placeholder="مثال: المدير، الكاشير 1..."
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات وتفاصيل إضافية</label>
                <textarea
                  rows={2}
                  placeholder="رقم الفاتورة المرجعي، تفاصيل الصيانة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white text-gray-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">تأكيد حذف المصروف</h3>
                <p className="text-[11px] text-gray-500">سيتم إزالة هذا السند من سجل المصاريف</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
              هل أنت متأكد من حذف المصروف "{expenseToDelete.title}" بقيمة{' '}
              <span className="font-bold text-red-600">{formatCurrency(expenseToDelete.amount, currency)}</span>؟
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs active:scale-95"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
