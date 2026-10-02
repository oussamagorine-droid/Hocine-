import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Scale,
  CreditCard,
  Users,
  Building2,
  Receipt,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3,
  ShieldAlert,
  Settings,
  Lock,
  Boxes,
} from 'lucide-react';
import { NavigationTab, useApp } from '../context/AppContext';

import { AppUser, UserPermissions } from '../types';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  shortcut?: string;
  permissionKey?: keyof UserPermissions;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, setIsLocked, alerts, settings } = useApp();

  const totalAlertsCount = alerts.reduce((acc, a) => acc + a.count, 0);

  const navItems: NavItem[] = [
    {
      id: 'pos',
      label: 'نقطة البيع والكاشير POS',
      icon: ShoppingCart,
      shortcut: 'F1',
      permissionKey: 'canAccessPos',
    },
    {
      id: 'dashboard',
      label: 'لوحة التحكم والإحصائيات',
      icon: LayoutDashboard,
      shortcut: 'F2',
      permissionKey: 'canAccessDashboard',
    },
    {
      id: 'scale',
      label: 'البيع بالميزان والأوزان',
      icon: Scale,
      shortcut: 'F3',
      permissionKey: 'canAccessScale',
    },
    {
      id: 'products',
      label: 'المنتجات والمخزون',
      icon: Package,
      shortcut: 'F4',
      permissionKey: 'canManageProducts',
    },
    {
      id: 'purchases',
      label: 'فواتير المشتريات والتوريد',
      icon: Truck,
      shortcut: 'F5',
      permissionKey: 'canManagePurchases',
    },
    {
      id: 'debts',
      label: 'الديون والكريدي',
      icon: CreditCard,
      shortcut: 'F6',
      permissionKey: 'canAccessDebts',
    },
    {
      id: 'customers',
      label: 'سجل الزبائن',
      icon: Users,
      shortcut: 'F7',
      permissionKey: 'canAccessCustomers',
    },
    {
      id: 'suppliers',
      label: 'سجل الموردين',
      icon: Building2,
      shortcut: 'F8',
      permissionKey: 'canAccessSuppliers',
    },
    {
      id: 'expenses',
      label: 'المصاريف اليومية',
      icon: Receipt,
      shortcut: 'F9',
      permissionKey: 'canManageExpenses',
    },
    {
      id: 'profit_loss',
      label: 'الأرباح والخسائر P&L',
      icon: TrendingUp,
      shortcut: 'F10',
      permissionKey: 'canViewProfits',
    },
    {
      id: 'stagnant_expiry',
      label: 'المنتجات الراكدة والصلاحية',
      icon: AlertTriangle,
      badge: totalAlertsCount > 0 ? totalAlertsCount : undefined,
      permissionKey: 'canAccessStagnantExpiry',
    },
    {
      id: 'invoices',
      label: 'أرشيف الفواتير والمبيعات',
      icon: FileText,
      permissionKey: 'canAccessInvoices',
    },
    {
      id: 'reports',
      label: 'التقارير الشاملة',
      icon: BarChart3,
      permissionKey: 'canAccessReports',
    },
    {
      id: 'users',
      label: 'المستخدمون والصلاحيات',
      icon: ShieldAlert,
      permissionKey: 'canManageUsers',
    },
    {
      id: 'settings',
      label: 'الإعدادات وتحديث البرنامج',
      icon: Settings,
      permissionKey: 'canManageSettings',
    },
  ];

  return (
    <aside className="w-[230px] bg-[#1E293B] text-white border-l border-white/10 flex flex-col h-screen select-none shrink-0 no-print">
      {/* Brand Header */}
      <div className="p-5 flex flex-col items-center border-b border-white/10 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl mb-2.5 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-600/30">
          {settings.storeName ? settings.storeName.charAt(0) : 'غ'}
        </div>
        <div className="text-base font-bold tracking-wide text-white truncate max-w-full">
          {settings.storeName || 'غذاء برو 2024'}
        </div>
        <div className="text-[10px] text-blue-300 opacity-80 uppercase tracking-widest mt-1 font-semibold">
          إدارة نقاط البيع الذكية
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // Check role permissions if restricted
          if (
            currentUser &&
            currentUser.role !== 'admin' &&
            item.permissionKey &&
            !currentUser.permissions[item.permissionKey]
          ) {
            return null;
          }

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/25'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isActive ? (
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] shrink-0"></div>
                ) : (
                  <Icon className="w-4 h-4 text-white/50 shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
                {item.shortcut && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-blue-600/40 text-blue-200' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {item.shortcut}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer User Info & Lock */}
      <div className="p-3.5 border-t border-white/10 bg-[#16202E] text-[11px] text-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70">حالة النظام: متصل</span>
          <span className="text-emerald-400 text-xs">●</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-white/40">المستخدم:</span>
            <span className="text-white font-bold truncate max-w-[90px]">{currentUser?.fullName}</span>
          </div>
          <button
            onClick={() => setIsLocked(true)}
            title="قفل الشاشة / تبديل المستخدم (Ctrl+L)"
            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-amber-400 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
