import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { ScaleView } from './components/ScaleView';
import { ProductsView } from './components/ProductsView';
import { PurchasesView } from './components/PurchasesView';
import { DebtsView } from './components/DebtsView';
import { CustomersSuppliersView } from './components/CustomersSuppliersView';
import { ReportsView } from './components/ReportsView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { ExcelManagerView } from './components/ExcelManagerView';
import { ProfitLossView } from './components/ProfitLossView';
import { ExpensesView } from './components/ExpensesView';
import { InvoicesArchiveView } from './components/InvoicesArchiveView';
import { StagnantExpiryView } from './components/StagnantExpiryView';
import { AlertsModal } from './components/AlertsModal';
import { LockScreen } from './components/LockScreen';
import { ShieldAlert, Lock, ShoppingCart } from 'lucide-react';

const RestrictedAccessView: React.FC<{
  title: string;
  requiredPermission: string;
}> = ({ title, requiredPermission }) => {
  const { setActiveTab, setIsLocked, currentUser } = useApp();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F1F3F6] text-center" dir="rtl">
      <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md w-full shadow-lg flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">صلاحية الوصول غير مفعلة</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            قسم <span className="font-bold text-gray-800">"{title}"</span> محمي ويتطلب صلاحية ({requiredPermission}).
          </p>
          <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <span>المستخدم المسجل حالياً:</span>
            <span className="font-bold text-blue-700">{currentUser?.fullName} ({currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'employee' ? 'مشرف' : 'كاشير'})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة البيع (الكاشير)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Lock className="w-4 h-4" />
            <span>تبديل المستخدم</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, isDbReady, isLoading, setIsLocked } = useApp();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+L or Cmd+L for quick screen lock
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'l' || e.key === 'م')) {
        e.preventDefault();
        setIsLocked(true);
        return;
      }

      // Map F1 to F10 to views
      const keyMap: Record<string, { tab: string; permission?: string }> = {
        F1: { tab: 'pos' },
        F2: { tab: 'dashboard' },
        F3: { tab: 'scale' },
        F4: { tab: 'products', permission: 'canManageProducts' },
        F5: { tab: 'purchases', permission: 'canManagePurchases' },
        F6: { tab: 'debts' },
        F7: { tab: 'customers' },
        F8: { tab: 'suppliers' },
        F9: { tab: 'expenses', permission: 'canManageExpenses' },
        F10: { tab: 'profit_loss', permission: 'canViewProfits' },
      };

      const match = keyMap[e.key];
      if (match) {
        e.preventDefault();
        if (
          currentUser &&
          currentUser.role !== 'admin' &&
          match.permission &&
          !currentUser.permissions[match.permission as keyof typeof currentUser.permissions]
        ) {
          return;
        }
        setActiveTab(match.tab as any);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setActiveTab, currentUser, setIsLocked]);

  if (!isDbReady && isLoading) {
    return (
      <div className="h-screen w-screen bg-[#F1F3F6] flex flex-col items-center justify-center text-slate-800 font-sans p-6 text-center" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-base font-bold text-gray-800 mb-1">جاري تهيئة قاعدة بيانات المحل ونقطة البيع...</p>
        <p className="text-xs text-gray-500 font-mono">نظام نقاط البيع وإدارة المواد الغذائية POS</p>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const permissions = currentUser?.permissions;

  // Render view with permissions checks
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView />;
      case 'scale':
        return <ScaleView />;
      case 'products':
        if (!isAdmin && !permissions?.canManageProducts) {
          return <RestrictedAccessView title="إدارة المنتجات والمخزون" requiredPermission="إدارة المنتجات والمخزون" />;
        }
        return <ProductsView />;
      case 'excel':
        if (!isAdmin && !permissions?.canManageProducts) {
          return <RestrictedAccessView title="تكامل قاعدة Excel" requiredPermission="إدارة المنتجات والمخزون" />;
        }
        return <ExcelManagerView />;
      case 'purchases':
        if (!isAdmin && !permissions?.canManagePurchases) {
          return <RestrictedAccessView title="فواتير المشتريات والتوريد" requiredPermission="إدارة المشتريات والتوريد" />;
        }
        return <PurchasesView />;
      case 'debts':
        return <DebtsView />;
      case 'customers':
        return <CustomersSuppliersView initialTab="customers" />;
      case 'suppliers':
        return <CustomersSuppliersView initialTab="suppliers" />;
      case 'expenses':
        if (!isAdmin && !permissions?.canManageExpenses) {
          return <RestrictedAccessView title="تسجيل وإدارة المصاريف" requiredPermission="إدارة المصاريف والنفقات" />;
        }
        return <ExpensesView />;
      case 'profit_loss':
        if (!isAdmin && !permissions?.canViewProfits) {
          return <RestrictedAccessView title="الأرباح والخسائر P&L" requiredPermission="الاطلاع على الأرباح والتقارير المالية" />;
        }
        return <ProfitLossView />;
      case 'stagnant_expiry':
        return <StagnantExpiryView />;
      case 'invoices':
        return <InvoicesArchiveView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        if (!isAdmin && !permissions?.canManageUsers) {
          return <RestrictedAccessView title="إدارة المستخدمين والصلاحيات" requiredPermission="إدارة المستخدمين والصلاحيات" />;
        }
        return <UsersView />;
      case 'settings':
        if (!isAdmin && !permissions?.canManageSettings) {
          return <RestrictedAccessView title="إعدادات المتجر والنسخ الاحتياطي" requiredPermission="إعدادات المتجر والنسخ الاحتياطي" />;
        }
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F1F3F6] text-[#1A1A1A] font-sans overflow-hidden select-none" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* View Switcher */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          {renderCurrentView()}
        </main>

        {/* Global Notifications & Alerts Modal */}
        <AlertsModal />

        {/* Global PIN Lock Screen Modal */}
        <LockScreen />

        {/* Technical Status Bar Footer */}
        <footer className="h-9 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-[11px] text-gray-500 font-bold select-none shrink-0 no-print">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              <span className="text-gray-700 font-mono">قاعدة البيانات: INDEXEDDB_LOCAL</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>المستخدم: <strong className="text-blue-700">{currentUser?.fullName}</strong> ({currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'employee' ? 'مشرف' : 'كاشير'})</span>
          </div>
          <div className="hidden md:flex items-center gap-5 text-gray-600 font-mono text-[10px]">
            <span>F1: كاشير</span>
            <span>F2: الرئيسية</span>
            <span>F3: ميزان</span>
            <span>F4: مخزون</span>
            <span>F5: مشتريات</span>
            <span>F6: ديون</span>
          </div>
          <div className="flex items-center gap-3">
            <span>دعم فني: 0550-XX-XX-XX</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600 font-mono font-bold">v2.1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
