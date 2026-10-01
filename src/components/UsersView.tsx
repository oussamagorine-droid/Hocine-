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
} from 'lucide-react';
import { db } from '../db/db';
import { useApp } from '../context/AppContext';
import { AppUser, UserPermissions, UserRole } from '../types';

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canViewProfits: true,
    canDeleteSales: true,
    canManageUsers: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canManageSettings: true,
    canApplyDiscount: true,
    canManageProducts: true,
  },
  employee: {
    canViewProfits: false,
    canDeleteSales: false,
    canManageUsers: false,
    canManagePurchases: true,
    canManageExpenses: true,
    canManageSettings: false,
    canApplyDiscount: true,
    canManageProducts: true,
  },
  cashier: {
    canViewProfits: false,
    canDeleteSales: false,
    canManageUsers: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canManageSettings: false,
    canApplyDiscount: true,
    canManageProducts: false,
  },
};

interface PermissionMeta {
  key: keyof UserPermissions;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const PERMISSIONS_LIST: PermissionMeta[] = [
  {
    key: 'canViewProfits',
    label: 'الاطلاع على الأرباح والتقارير المالية',
    description: 'رؤية صافي الأرباح وهوامش الربح وأسعار الشراء في لوحة التحكم والتقارير',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    key: 'canManageProducts',
    label: 'إدارة المنتجات والمخزون',
    description: 'إضافة وتعديل وحذف المنتجات وتغيير الأسعار والباركود وتكامل Excel',
    icon: Package,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    key: 'canManagePurchases',
    label: 'فواتير المشتريات وتوريد البضاعة',
    description: 'تسجيل شحنات الموردين وزيادة كميات المخزن وتحديث أسعار التكلفة',
    icon: Truck,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    key: 'canManageExpenses',
    label: 'تسجيل وإدارة المصاريف والنفقات',
    description: 'إضافة وتعديل سندات الصرف وفواتير الكهرباء والإيجار والرواتب',
    icon: Receipt,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    key: 'canApplyDiscount',
    label: 'تطبيق التخفيضات والخصومات في POS',
    description: 'منح خصومات نقدية للزبائن أثناء إنشاء الفاتورة في الكاشير',
    icon: Percent,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    key: 'canDeleteSales',
    label: 'إلغاء وحذف فواتير البيع',
    description: 'صلاحية حذف أو استرجاع فواتير البيع الصادرة من الأرشيف',
    icon: Trash2,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    key: 'canManageUsers',
    label: 'إدارة المستخدمين وتعديل الصلاحيات',
    description: 'إضافة مستخدمين جدد وتغيير رموز PIN وتعديل صلاحيات الوصول',
    icon: ShieldCheck,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    key: 'canManageSettings',
    label: 'إعدادات المتجر والنسخ الاحتياطي',
    description: 'تعديل اسم المتجر ومعلومات الوصل والنسخ الاحتياطي وتحديث النظام',
    icon: Settings,
    color: 'text-slate-700 bg-slate-100 border-slate-300',
  },
];

export const UsersView: React.FC = () => {
  const { currentUser, setCurrentUser, triggerRefresh, refreshTrigger, playSuccessSound, setActiveTab } = useApp();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showPins, setShowPins] = useState<boolean>(false);

  // User Modal State
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
    }
    load();
  }, [refreshTrigger]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

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
    // Apply default permissions template for that role while letting user customize further
    setFormPermissions({ ...DEFAULT_ROLE_PERMISSIONS[newRole] });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllPermissions = () => {
    setFormPermissions({
      canViewProfits: true,
      canDeleteSales: true,
      canManageUsers: true,
      canManagePurchases: true,
      canManageExpenses: true,
      canManageSettings: true,
      canApplyDiscount: true,
      canManageProducts: true,
    });
  };

  const handleDeselectAllPermissions = () => {
    setFormPermissions({
      canViewProfits: false,
      canDeleteSales: false,
      canManageUsers: false,
      canManagePurchases: false,
      canManageExpenses: false,
      canManageSettings: false,
      canApplyDiscount: false,
      canManageProducts: false,
    });
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
      // If currently logged in user was edited, update active session
      if (currentUser?.id === editingUser.id) {
        setCurrentUser({ ...payload, id: editingUser.id });
      }
      showToast(`تم تحديث بيانات وصلاحيات المستخدم "${payload.fullName}" بنجاح!`);
    } else {
      const newId = await db.users.add(payload);
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>إدارة المستخدمين وصلاحيات الكاشير والعمال</span>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {users.length} مستخدم مسجل
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            تحديد صلاحيات الوصول بدقة، رموز PIN لتسجيل الدخول السريع، وتأمين الأرباح والمعاملات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
            title={showPins ? 'إخفاء رموز PIN' : 'إظهار رموز PIN'}
          >
            {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPins ? 'إخفاء الرموز' : 'إظهار رموز PIN'}</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة مستخدم / كاشير جديد</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-800">قائمة حسابات المستخدمين ومستويات الوصول</h3>
          <span className="text-xs text-gray-500 font-semibold">
            المستخدم الحالي المسجل: <span className="font-bold text-blue-700">{currentUser?.fullName} ({currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'employee' ? 'مشرف' : 'كاشير'})</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">المستخدم</th>
                <th className="p-3">اسم الدخول</th>
                <th className="p-3">الدور الأساسي</th>
                <th className="p-3">رمز PIN</th>
                <th className="p-3">الصلاحيات المفعلة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const permissionsCount = Object.values(u.permissions || {}).filter(Boolean).length;

                return (
                  <tr key={u.id} className={`transition-colors ${isCurrent ? 'bg-blue-50/40' : 'hover:bg-gray-50/80'}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
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
                            صلاحيات كاملة غير مقيدة (8/8)
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded border border-gray-200">
                              {permissionsCount} من 8 صلاحيات
                            </span>
                            {u.permissions?.canViewProfits && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                                أرباح
                              </span>
                            )}
                            {u.permissions?.canManageProducts && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                مخزون
                              </span>
                            )}
                            {u.permissions?.canManagePurchases && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                                مشتريات
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
                        {!isCurrent && (
                          <button
                            onClick={() => handleQuickSwitchUser(u)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition-colors active:scale-95"
                            title="تسجيل الدخول والتبديل لهذا الحساب فوراً"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>دخول</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-blue-600 transition-colors"
                          title="تعديل بيانات الحساب والصلاحيات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors"
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

      {/* Floating Feedback Toast */}
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

      {/* Delete Confirmation Modal */}
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
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                نعم، احذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles & Permissions Reference Card */}
      <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>دليل الصلاحيات والأدوار في نظام السوبرماركت:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">1</span>
              <h4 className="font-bold text-purple-800 text-sm">المدير العام (Admin)</h4>
            </div>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              تحكم مطلق في كافة أقسام النظام: رؤية تقارير الأرباح وهوامش الربح، إدارة المستخدمين ورموز PIN، تعديل إعدادات المتجر، والنسخ الاحتياطي.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">2</span>
              <h4 className="font-bold text-blue-800 text-sm">مشرف المخزن (Employee)</h4>
            </div>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              صلاحية إدارة البضائع وإدخال المنتجات، تسجيل فواتير التوريد من الموردين، وإدارة المصاريف مع حجب الإحصائيات والأرباح الحساسة.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">3</span>
              <h4 className="font-bold text-emerald-800 text-sm">كاشير نقطة البيع (Cashier)</h4>
            </div>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              مخصص لعمليات البيع السريع على الكاشير، البيع بالميزان، وإصدار وطباعة الفواتير فقط، بدون صلاحية رؤية أرباح المحل أو تكلفة الشراء.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USER FORM MODAL WITH GRANULAR PERMISSIONS */}
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
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
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

              {/* Granular Permissions Section */}
              <div className="pt-3 border-t border-gray-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>تخصيص الصلاحيات الفردية (8 صلاحيات متاحة):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="text-[11px] text-gray-500 hover:underline font-bold"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERMISSIONS_LIST.map((perm) => {
                    const isChecked = formPermissions[perm.key];
                    const Icon = perm.icon;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-blue-50/60 border-blue-300 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-xs ${isChecked ? 'text-blue-950' : 'text-gray-700'}`}>
                            {perm.label}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{perm.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Status Switch */}
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
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors text-xs"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingUser ? 'حفظ التعديلات والصلاحيات' : 'حفظ وإضافة المستخدم الجديد'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
