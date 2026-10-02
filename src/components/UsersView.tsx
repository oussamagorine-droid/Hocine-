import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  Lock,
  User,
  CheckCircle2,
  X,
  Shield,
  Eye,
  EyeOff,
  LogIn,
  Check,
  AlertTriangle,
  Sparkles,
  Settings,
  DollarSign,
  Package,
  Truck,
  Receipt,
  Percent,
  ShoppingCart,
  LayoutDashboard,
  Scale,
  BarChart3,
  CreditCard,
  Users as UsersIcon,
  Building2,
  FileText,
  TrendingUp,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { AppUser, UserPermissions, UserRole } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../db/seedData';

interface PermissionMeta {
  key: keyof UserPermissions;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sensitive?: boolean;
}

// 1. الشاشات والأقسام التي تظهر في القائمة الجانبية (ما يظهر للعامل) - بدون Excel
export const SCREEN_PERMISSIONS: PermissionMeta[] = [
  {
    key: 'canAccessPos',
    label: 'نقطة البيع والكاشير POS',
    description: 'شاشة تمرير ومسح السلع، حساب الإجمالي، واستلام المبالغ والطباعة',
    icon: ShoppingCart,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    key: 'canAccessScale',
    label: 'البيع بالميزان والأوزان',
    description: 'شاشة وزن وحساب أسعار الخضر والفواكه واللحوم بالكيلوغرام',
    icon: Scale,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    key: 'canAccessReports',
    label: 'التقارير الشاملة والتحليلات 📊',
    description: 'كشوفات المداخيل، إجمالي المبيعات، ومخططات الدخل (مغلق للكاشير تلقائياً)',
    icon: BarChart3,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    sensitive: true,
  },
  {
    key: 'canAccessDashboard',
    label: 'لوحة التحكم والمؤشرات اليومية',
    description: 'مداخيل اليوم، إحصائيات سريعة، ومعدل المبيعات العامة',
    icon: LayoutDashboard,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    sensitive: true,
  },
  {
    key: 'canAccessInvoices',
    label: 'أرشيف فواتير البيع والمبيعات',
    description: 'سجل الفواتير الصادرة للزبائن ومراجعة العمليات السابقة',
    icon: FileText,
    color: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  {
    key: 'canAccessDebts',
    label: 'سجل الديون والكريدي',
    description: 'متابعة ديون الزبائن، دفتر الكريدي، واستلام دفعات السداد',
    icon: CreditCard,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    key: 'canAccessCustomers',
    label: 'سجل ودليل الزبائن',
    description: 'إضافة وتعديل بيانات العملاء وأرقام هواتفهم وعناوينهم',
    icon: UsersIcon,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    key: 'canManageProducts',
    label: 'إدارة المنتجات والمخزون',
    description: 'إضافة وتعديل المنتجات، تعديل الأسعار، ومراقبة كميات المخزن',
    icon: Package,
    color: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    key: 'canManagePurchases',
    label: 'فواتير المشتريات والتوريد',
    description: 'تسجيل بضائع الموردين وتكلفة شحنات السلع الواردة',
    icon: Truck,
    color: 'text-violet-700 bg-violet-50 border-violet-200',
  },
  {
    key: 'canAccessSuppliers',
    label: 'سجل الموردين والشركات',
    description: 'دليل أرقام الموزعين ومتابعة حسابات الموردين',
    icon: Building2,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  {
    key: 'canManageExpenses',
    label: 'المصاريف اليومية ونفقات المحل',
    description: 'تسجيل إيصالات الكراء، الكهرباء، التغليف ومصاريف المحل',
    icon: Receipt,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    key: 'canAccessStagnantExpiry',
    label: 'المنتجات الراكدة والصلاحية',
    description: 'مراقبة تواريخ انتهاء الصلاحية والسلع الراكدة غير المباعة',
    icon: AlertTriangle,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  {
    key: 'canManageUsers',
    label: 'إدارة المستخدمين والصلاحيات',
    description: 'إضافة وتعديل حسابات العمال وتغيير رموز PIN (للمدير فقط)',
    icon: ShieldCheck,
    color: 'text-slate-700 bg-slate-100 border-slate-300',
    sensitive: true,
  },
  {
    key: 'canManageSettings',
    label: 'إعدادات المتجر وهوية الفاتورة',
    description: 'تعديل اسم المحل، ترويسة الفاتورة، والنسخ الاحتياطي للنظام',
    icon: Settings,
    color: 'text-slate-700 bg-slate-100 border-slate-300',
    sensitive: true,
  },
];

// 2. العمليات والصلاحيات الحساسة (المالية والحذف)
export const ACTION_PERMISSIONS: PermissionMeta[] = [
  {
    key: 'canViewProfits',
    label: 'الاطلاع على الأرباح الصافية وهوامش الربح وأسعار الشراء (P&L)',
    description: 'إظهار هامش الربح الصافي وأسعار تكلفة السلع في كافة الواجهات (محمي)',
    icon: TrendingUp,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    sensitive: true,
  },
  {
    key: 'canDeleteSales',
    label: 'إلغاء وحذف فواتير البيع من الأرشيف',
    description: 'صلاحية حذف فاتورة صادرة واسترجاع كميات المخزون المباعة',
    icon: Trash2,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    sensitive: true,
  },
  {
    key: 'canApplyDiscount',
    label: 'تطبيق التخفيضات والخصم في الفاتورة للزبائن',
    description: 'إمكانية إعطاء تخفيض نقدي للزبون أثناء إنشاء الفاتورة في الكاشير',
    icon: Percent,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
];

export const UsersView: React.FC = () => {
  const { currentUser, setCurrentUser, triggerRefresh, refreshTrigger, playSuccessSound, setActiveTab } = useApp();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showPins, setShowPins] = useState<boolean>(false);

  // Sub Tab Navigation inside UsersView:
  // 'users_list' = حسابات المستخدمين والـ PIN
  // 'customize_worker' = تخصيص شاشات العامل التفاعلية
  const [activeSubTab, setActiveSubTab] = useState<'users_list' | 'customize_worker'>('users_list');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [workerPermissions, setWorkerPermissions] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.cashier);
  const [isSavingCustomizer, setIsSavingCustomizer] = useState<boolean>(false);

  // User Modal State (for creating/editing full user account)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formUsername, setFormUsername] = useState<string>('');
  const [formFullName, setFormFullName] = useState<string>('');
  const [formPin, setFormPin] = useState<string>('1234');
  const [formRole, setFormRole] = useState<UserRole>('cashier');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.cashier);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    async function load() {
      const u = await db.users.toArray();
      setUsers(u);
      // Select first non-admin or first user for customizer tab
      if (u.length > 0 && selectedWorkerId === null) {
        const worker = u.find((user) => user.role !== 'admin') || u[0];
        setSelectedWorkerId(worker.id || 1);
        setWorkerPermissions({
          ...DEFAULT_ROLE_PERMISSIONS[worker.role || 'cashier'],
          ...(worker.permissions || {}),
        });
      }
    }
    load();
  }, [refreshTrigger]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const selectedWorker = users.find((u) => u.id === selectedWorkerId);

  const handleSelectWorkerForCustomizer = (u: AppUser) => {
    if (!u.id) return;
    setSelectedWorkerId(u.id);
    setWorkerPermissions({
      ...DEFAULT_ROLE_PERMISSIONS[u.role || 'cashier'],
      ...(u.permissions || {}),
    });
  };

  const openCustomizerForUser = (u: AppUser) => {
    handleSelectWorkerForCustomizer(u);
    setActiveSubTab('customize_worker');
  };

  const toggleWorkerPermission = (key: keyof UserPermissions) => {
    setWorkerPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Customizer Presets
  const applyCustomizerPreset = (preset: 'cashier_only' | 'cashier_debts' | 'warehouse' | 'all') => {
    if (preset === 'cashier_only') {
      setWorkerPermissions({
        canAccessPos: true,
        canAccessScale: true,
        canApplyDiscount: true,
        canAccessDashboard: false,
        canAccessReports: false, // 🔒 محمي
        canViewProfits: false, // 🔒 محمي
        canAccessInvoices: false,
        canAccessDebts: false,
        canAccessCustomers: false,
        canAccessSuppliers: false,
        canManageProducts: false,
        canManagePurchases: false,
        canManageExpenses: false,
        canAccessStagnantExpiry: false,
        canManageUsers: false,
        canManageSettings: false,
        canDeleteSales: false,
      });
      showToast('تم ضبط الصلاحيات: كاشير نقطة بيع فقط (محمي من التقارير والأرباح)');
    } else if (preset === 'cashier_debts') {
      setWorkerPermissions({
        canAccessPos: true,
        canAccessScale: true,
        canAccessDebts: true,
        canAccessCustomers: true,
        canAccessInvoices: true,
        canApplyDiscount: true,
        canAccessDashboard: false,
        canAccessReports: false,
        canViewProfits: false,
        canManageProducts: false,
        canManagePurchases: false,
        canAccessSuppliers: false,
        canManageExpenses: false,
        canAccessStagnantExpiry: false,
        canManageUsers: false,
        canManageSettings: false,
        canDeleteSales: false,
      });
      showToast('تم ضبط الصلاحيات: كاشير متقدم (بيع + ديون وزبائن)');
    } else if (preset === 'warehouse') {
      setWorkerPermissions({
        canAccessPos: false,
        canAccessScale: false,
        canApplyDiscount: false,
        canAccessDashboard: false,
        canAccessReports: false,
        canViewProfits: false,
        canAccessInvoices: false,
        canAccessDebts: false,
        canAccessCustomers: false,
        canManageProducts: true,
        canManagePurchases: true,
        canAccessSuppliers: true,
        canAccessStagnantExpiry: true,
        canManageExpenses: false,
        canManageUsers: false,
        canManageSettings: false,
        canDeleteSales: false,
      });
      showToast('تم ضبط الصلاحيات: أمين مخزن ومشتريات');
    } else if (preset === 'all') {
      setWorkerPermissions({ ...DEFAULT_ROLE_PERMISSIONS.admin });
      showToast('تم تفعيل كافة الشاشات والصلاحيات');
    }
  };

  const handleSaveCustomizer = async () => {
    if (!selectedWorkerId || !selectedWorker) return;
    setIsSavingCustomizer(true);
    try {
      await db.users.update(selectedWorkerId, {
        permissions: workerPermissions,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedWorkerId ? { ...u, permissions: workerPermissions } : u))
      );

      if (currentUser?.id === selectedWorkerId) {
        setCurrentUser({ ...selectedWorker, permissions: workerPermissions });
      }

      playSuccessSound();
      showToast(`تم حفظ وتطبيق ما يراه "${selectedWorker.fullName}" بنجاح!`);
      triggerRefresh();
    } catch (err) {
      console.error('Save customizer error:', err);
      showToast('حدث خطأ أثناء حفظ التعديلات', 'error');
    } finally {
      setIsSavingCustomizer(false);
    }
  };

  const handlePreviewAsWorker = () => {
    if (!selectedWorker) return;
    setCurrentUser({ ...selectedWorker, permissions: workerPermissions });
    playSuccessSound();
    setActiveTab(workerPermissions.canAccessPos ? 'pos' : 'dashboard');
  };

  // User Modal Handlers
  const openAddModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormPin('1234');
    setFormRole('cashier');
    setFormPermissions({ ...DEFAULT_ROLE_PERMISSIONS.cashier });
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormFullName(u.fullName);
    setFormPin(u.pinCode || '1234');
    setFormRole(u.role);
    setFormPermissions({
      ...DEFAULT_ROLE_PERMISSIONS[u.role],
      ...(u.permissions || {}),
    });
    setFormIsActive(u.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormRole(newRole);
    setFormPermissions({ ...DEFAULT_ROLE_PERMISSIONS[newRole] });
  };

  const toggleModalPermission = (key: keyof UserPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formFullName.trim() || !formPin.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (formPin.length < 4) {
      setFormError('رمز PIN يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    const payload: Omit<AppUser, 'id'> = {
      username: formUsername.trim(),
      fullName: formFullName.trim(),
      pinCode: formPin.trim(),
      role: formRole,
      permissions: formRole === 'admin' ? DEFAULT_ROLE_PERMISSIONS.admin : formPermissions,
      isActive: formIsActive,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    if (editingUser?.id) {
      await db.users.update(editingUser.id, payload);
      if (currentUser?.id === editingUser.id) {
        setCurrentUser({ ...payload, id: editingUser.id });
      }
      showToast(`تم تحديث بيانات وصلاحيات "${payload.fullName}" بنجاح!`);
    } else {
      await db.users.add(payload);
      showToast(`تم إنشاء وإضافة المستخدم "${payload.fullName}" بنجاح!`);
    }

    playSuccessSound();
    setIsModalOpen(false);
    triggerRefresh();
  };

  const handleQuickSwitchUser = (u: AppUser) => {
    if (!u.isActive) {
      showToast('هذا الحساب معطل حالياً من طرف المدير', 'error');
      return;
    }
    setCurrentUser(u);
    playSuccessSound();
    showToast(`تم تسجيل الدخول بنجاح بحساب (${u.fullName})`);
    if (u.role === 'cashier') {
      setActiveTab('pos');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget?.id) return;
    if (users.length <= 1) {
      showToast('لا يمكن حذف المستخدم الأخير في النظام!', 'error');
      setDeleteTarget(null);
      return;
    }
    if (currentUser?.id === deleteTarget.id) {
      showToast('لا يمكنك حذف الحساب المسجل به حالياً!', 'error');
      setDeleteTarget(null);
      return;
    }

    try {
      await db.users.delete(deleteTarget.id);
      playSuccessSound();
      showToast(`تم حذف حساب "${deleteTarget.fullName}" بنجاح`);
      triggerRefresh();
    } catch (err) {
      console.error('Delete user error:', err);
      showToast('حدث خطأ أثناء حذف الحساب', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const visibleScreensCount = SCREEN_PERMISSIONS.filter((s) => workerPermissions[s.key]).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F1F3F6]" dir="rtl">
      {/* Toast Notification */}
      {feedback && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border ${
              feedback.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Main Header Card with Unified Sub-Tabs */}
      <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <span>إدارة المستخدمين والصلاحيات وتخصيص شاشات العامل</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              تحكم كامل ومباشر في حسابات العمال، رموز PIN، وتحديد ما يظهر وما يختفي تماماً أمام كل عامل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full border border-blue-200 font-mono">
              {users.length} مستخدمين مسجلين
            </span>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl border border-gray-200 max-w-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('users_list')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'users_list'
                ? 'bg-white text-blue-700 shadow-xs border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>حسابات المستخدمين والـ PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('customize_worker')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'customize_worker'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>تخصيص شاشات العامل (ماذا يرى) 🎛️</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: USERS LIST & ACCOUNTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'users_list' && (
        <div className="space-y-4">
          {/* Info Banner for editing username & password */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3 text-xs text-amber-900">
            <Key className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">تعديل اسم المستخدم وكلمة المرور (PIN):</span>
              <span className="mr-1">انقر على زر التعديل (<Edit2 className="w-3 h-3 inline mx-0.5 text-amber-700" />) بجانب أي مستخدم في الجدول أدناه لتغيير اسم الدخول، الاسم الكامل، أو كلمة المرور السريعة فوراً.</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                title={showPins ? 'إخفاء رموز PIN' : 'إظهار رموز PIN'}
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPins ? 'إخفاء رموز PIN' : 'إظهار رموز PIN'}</span>
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة مستخدم / كاشير جديد</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                  <tr>
                    <th className="p-3">المستخدم والاسم</th>
                    <th className="p-3">اسم الدخول</th>
                    <th className="p-3">الدور والصفة</th>
                    <th className="p-3">رمز الدخول PIN</th>
                    <th className="p-3">الشاشات والصلاحيات</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">التحكم والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    const permissionsCount = Object.values(u.permissions || {}).filter(Boolean).length;

                    return (
                      <tr key={u.id} className={`hover:bg-blue-50/30 transition-colors ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : u.role === 'employee'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {u.fullName.slice(0, 1)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{u.fullName}</span>
                                {isCurrent && (
                                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-sm">
                                    نشط حالياً
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-gray-700 font-bold">{u.username}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              u.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : u.role === 'employee'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {u.role === 'admin' ? '👑 مدير عام (Admin)' : u.role === 'employee' ? '💼 مشرف (Employee)' : '🛒 كاشير (Cashier)'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold">
                          {showPins ? (
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {u.pinCode || '1234'}
                            </span>
                          ) : (
                            <span className="text-gray-400">••••</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {u.role === 'admin' ? (
                              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200">
                                صلاحيات كاملة (16/16)
                              </span>
                            ) : (
                              <>
                                <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded border border-gray-200">
                                  {permissionsCount} من 16 صلاحية
                                </span>
                                {u.permissions?.canAccessPos && (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                    كاشير POS
                                  </span>
                                )}
                                {u.permissions?.canAccessReports ? (
                                  <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                    تقارير 📊
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                    التقارير محجوبة 🔒
                                  </span>
                                )}
                                {u.permissions?.canViewProfits && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                                    أرباح
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {u.isActive ? 'نشط ومفعل' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Customize screens button */}
                            <button
                              type="button"
                              onClick={() => openCustomizerForUser(u)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold transition-colors cursor-pointer text-[11px]"
                              title="تخصيص الشاشات التي تظهر لهذا العامل"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                              <span>تخصيص شاشاته</span>
                            </button>

                            {!isCurrent && (
                              <button
                                onClick={() => handleQuickSwitchUser(u)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors active:scale-95 cursor-pointer text-[11px]"
                                title="تسجيل الدخول والتبديل لهذا الحساب فوراً"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>دخول</span>
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                              title="تعديل الحساب"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: INTEGRATED WORKER SCREENS CUSTOMIZER (ماذا يرى العامل) */}
      {/* ========================================================================= */}
      {activeSubTab === 'customize_worker' && (
        <div className="space-y-4">
          {/* Worker Selector */}
          <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>اختر العامل أو الكاشير المراد تحديد أولوياته وشاشاته:</span>
              </h2>
              {selectedWorker && (
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-200">
                  العامل المحدد حالياً: {selectedWorker.fullName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {users.map((u) => {
                const isSelected = u.id === selectedWorkerId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectWorkerForCustomizer(u)}
                    className={`p-3 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-gray-50/70 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        u.role === 'admin'
                          ? 'bg-purple-600 text-white'
                          : u.role === 'employee'
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {u.fullName.slice(0, 1)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-gray-900 truncate">{u.fullName}</p>
                      <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>@{u.username}</span>
                        <span>•</span>
                        <span className="font-bold text-blue-700">
                          {u.role === 'admin' ? 'مدير' : u.role === 'employee' ? 'مشرف' : 'كاشير'}
                        </span>
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Presets */}
          <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>نماذج سريعة جاهزة بضغطة زر واحدة (Presets):</span>
              </h2>
              <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                تجهيز فوري ⚡
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => applyCustomizerPreset('cashier_only')}
                className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100 text-right transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    الأكثر طلباً ⭐
                  </span>
                </div>
                <div>
                  <p className="font-black text-xs text-emerald-950">كاشير نقطة بيع فقط (محمي)</p>
                  <p className="text-[10px] text-emerald-800 leading-tight mt-0.5">
                    يرى فقط شاشة البيع والميزان؛ وتختفي التقارير والأرباح والمخزون والإحصائيات نهائياً!
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomizerPreset('cashier_debts')}
                className="p-3.5 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100 text-right transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <p className="font-black text-xs text-blue-950">كاشير متقدم (بيع + ديون وزبائن)</p>
                  <p className="text-[10px] text-blue-800 leading-tight mt-0.5">
                    شاشة الكاشير + دفتر الكريدي للزبائن وسجل الفواتير
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomizerPreset('warehouse')}
                className="p-3.5 rounded-xl border border-violet-300 bg-violet-50/60 hover:bg-violet-100 text-right transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <p className="font-black text-xs text-violet-950">أمين مخزن ومشتريات</p>
                  <p className="text-[10px] text-violet-800 leading-tight mt-0.5">
                    إدارة المنتجات، فواتير المشتريات ومراقبة الصلاحية
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyCustomizerPreset('all')}
                className="p-3.5 rounded-xl border border-purple-300 bg-purple-50/60 hover:bg-purple-100 text-right transition-all flex flex-col justify-between gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <p className="font-black text-xs text-purple-950">مدير عام (صلاحيات كاملة)</p>
                  <p className="text-[10px] text-purple-800 leading-tight mt-0.5">
                    تفعيل كافة شاشات البرنامج بدون أي حجب
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Switches & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Interactive Switches */}
            <div className="lg:col-span-8 space-y-4">
              {/* Screens Toggles */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                      <span>شاشات العرض المسموح بظهورها في القائمة الجانبية:</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      انقر على زر التبديل لتفعيل أو إخفاء أي شاشة فوراً عن العامل
                    </p>
                  </div>

                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 font-mono">
                    {visibleScreensCount} شاشات ظاهرة
                  </span>
                </div>

                <div className="space-y-2">
                  {SCREEN_PERMISSIONS.map((screen) => {
                    const isChecked = Boolean(workerPermissions[screen.key]);
                    const Icon = screen.icon;

                    return (
                      <div
                        key={screen.key}
                        onClick={() => toggleWorkerPermission(screen.key)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isChecked
                            ? screen.sensitive
                              ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                              : 'bg-blue-50/50 border-blue-200 shadow-2xs'
                            : 'bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${screen.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-bold text-xs ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                                {screen.label}
                              </p>
                              {screen.sensitive && (
                                <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-2 py-0.2 rounded-full border border-rose-200 shrink-0">
                                  🔒 تقرير مالي حساس
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5 truncate sm:whitespace-normal">
                              {screen.description}
                            </p>
                          </div>
                        </div>

                        {/* Switch */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${isChecked ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {isChecked ? 'ظاهرة' : 'مخفية'}
                          </span>
                          <div
                            className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                              isChecked ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sensitive Financial Actions */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                    <span>الصلاحيات المالية والعمليات الحساسة:</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    تحديد ما إذا كان العامل يستطيع رؤية أرباح المحل الصافية أو حذف وتعديل الفواتير
                  </p>
                </div>

                <div className="space-y-2">
                  {ACTION_PERMISSIONS.map((action) => {
                    const isChecked = Boolean(workerPermissions[action.key]);
                    const Icon = action.icon;

                    return (
                      <div
                        key={action.key}
                        onClick={() => toggleWorkerPermission(action.key)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : 'bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${action.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-xs ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                              {action.label}
                            </p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                              {action.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${isChecked ? 'text-amber-700' : 'text-gray-400'}`}>
                            {isChecked ? 'مفعلة' : 'معطلة'}
                          </span>
                          <div
                            className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                              isChecked ? 'bg-amber-600 justify-end' : 'bg-gray-300 justify-start'
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Sidebar Preview (Desktop Sticky) */}
            <div className="lg:col-span-4 sticky top-6 space-y-4">
              <div className="bg-[#1E293B] text-white rounded-2xl p-4 shadow-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>معاينة حية: كيف تظهر القائمة للعامل؟</span>
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedWorker ? selectedWorker.fullName : 'الكاشير'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-tight">
                  هذه هي الشاشات التي ستظهر في شريط القائمة الجانبية للعامل:
                </p>

                {/* Mocked Sidebar Nav Items */}
                <div className="space-y-1.5 py-1 max-h-[460px] overflow-y-auto">
                  {SCREEN_PERMISSIONS.map((screen) => {
                    const isVisible = Boolean(workerPermissions[screen.key]);
                    if (!isVisible) return null;
                    const Icon = screen.icon;

                    return (
                      <div
                        key={screen.key}
                        className="p-2.5 rounded-lg bg-white/10 border border-white/10 flex items-center justify-between text-xs font-bold text-white animate-in fade-in"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="truncate">{screen.label}</span>
                        </div>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                          ظاهرة ✓
                        </span>
                      </div>
                    );
                  })}

                  {visibleScreensCount === 0 && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 space-y-1">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
                      <p>لم يتم تفعيل أي شاشة لهذا العامل!</p>
                      <p className="text-[10px]">يرجى تفعيل نقطة البيع POS على الأقل</p>
                    </div>
                  )}
                </div>

                {/* Save and Preview Buttons */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={handleSaveCustomizer}
                    disabled={isSavingCustomizer}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingCustomizer ? 'جاري الحفظ...' : 'حفظ التعديلات فوراً'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePreviewAsWorker}
                    className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>معاينة واجهة العامل وتجربتها</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">تأكيد حذف المستخدم</h3>
                <p className="text-xs text-gray-500">هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200">
              هل أنت متأكد من رغبتك في حذف حساب <strong className="text-gray-900">"{deleteTarget.fullName}"</strong> ({deleteTarget.username})؟
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                نعم، احذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER FORM MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in duration-200"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{editingUser ? `تعديل المستخدم (${editingUser.fullName})` : 'إضافة مستخدم / كاشير جديد'}</span>
                </h3>
                <p className="text-[11px] text-gray-500">تخصيص الصلاحيات وتعيين رمز الدخول السريع</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="مثال: أيمن بلقاسم"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 block">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="aymen_cashier"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">رمز PIN السريع (4 أرقام على الأقل) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-gray-50 border border-gray-200 text-blue-600 font-mono text-center text-base font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">يستخدم لتسجيل الدخول السريع وقفل الشاشة</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 block">الدور والنموذج الافتراضي *</label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-bold text-xs"
                  >
                    <option value="cashier">كاشير نقطة بيع (Cashier)</option>
                    <option value="employee">مشرف مخزن وتوريد (Employee)</option>
                    <option value="admin">مدير عام للنظام (Admin)</option>
                  </select>
                </div>
              </div>

              {/* Modal Screens Checkboxes */}
              <div className="pt-3 border-t border-gray-200 space-y-2.5">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>شاشات العرض المسموح بظهورها لهذا المستخدم:</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCREEN_PERMISSIONS.map((perm) => {
                    const isChecked = Boolean(formPermissions[perm.key]);
                    const Icon = perm.icon;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => toggleModalPermission(perm.key)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                          isChecked
                            ? perm.sensitive
                              ? 'bg-rose-50/70 border-rose-300'
                              : 'bg-blue-50/70 border-blue-300 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? perm.sensitive
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-[11px] ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                            {perm.label}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{perm.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Action Permissions */}
              <div className="pt-3 border-t border-gray-200 space-y-2.5">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span>الصلاحيات المالية والعمليات الحساسة:</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACTION_PERMISSIONS.map((perm) => {
                    const isChecked = Boolean(formPermissions[perm.key]);
                    const Icon = perm.icon;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => toggleModalPermission(perm.key)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                          isChecked
                            ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-[11px] ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                            {perm.label}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{perm.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Status */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 block text-xs">حالة الحساب</span>
                  <span className="text-[10px] text-gray-500">تمكين أو إيقاف تسجيل الدخول لهذا المستخدم</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
