import React, { useEffect, useState } from 'react';
import {
  Bell,
  Maximize,
  Minimize,
  Search,
  ShoppingCart,
  Clock,
  Calendar,
  WifiOff,
  Zap,
  Lock,
  User,
  Shield,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    alerts,
    setIsAlertsModalOpen,
    currentUser,
    setIsLocked,
  } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('ar-DZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'لوحة التحكم والمؤشرات الرئيسية';
      case 'pos':
        return 'نقطة البيع السريعة - الكاشير';
      case 'scale':
        return 'البيع بالميزان وتسعير الأوزان';
      case 'products':
        return 'دليل المنتجات وإدارة المخزون';
      case 'excel':
        return 'تكامل وقاعدة بيانات Excel';
      case 'purchases':
        return 'فواتير المشتريات والتوريد';
      case 'debts':
        return 'إدارة الديون وحسابات الكريدي';
      case 'customers':
        return 'سجل الزبائن وعمليات الشراء';
      case 'suppliers':
        return 'سجل الموردين والمستحقات';
      case 'expenses':
        return 'المصاريف اليومية والتشغيلية';
      case 'profit_loss':
        return 'الأرباح والخسائر والتحليلات المالية';
      case 'stagnant_expiry':
        return 'مراقبة البضاعة الراكدة وتواريخ الصلاحية';
      case 'invoices':
        return 'أرشيف الفواتير وإعادة الطباعة';
      case 'reports':
        return 'التقارير الشاملة والجداول';
      case 'users':
        return 'المستخدمون والصلاحيات';
      case 'settings':
        return 'إعدادات المتجر والنسخ الاحتياطي';
      default:
        return 'نظام نقاط البيع';
    }
  };

  const totalAlerts = alerts.reduce((acc, a) => acc + a.count, 0);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between gap-4 select-none shrink-0 shadow-sm no-print">
      {/* Current Page Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
          {getTabTitle()}
        </h2>
        <span className="hidden lg:inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
          <WifiOff className="w-3 h-3 text-emerald-600" />
          <span>محلي بدون إنترنت 100%</span>
        </span>
      </div>

      {/* Center Digital Clock & Date */}
      <div className="hidden md:flex items-center gap-4 bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-200 text-xs">
        <div className="flex items-center gap-1.5 text-gray-800 font-mono font-bold">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{timeStr}</span>
        </div>
        <div className="h-3 w-px bg-gray-300"></div>
        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Quick POS Button if on other tab */}
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            title="الانتقال إلى الكاشير (F1)"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">+ فاتورة بيع جديدة</span>
          </button>
        )}

        {/* Quick Scale Button if not on scale */}
        {activeTab !== 'scale' && (
          <button
            onClick={() => setActiveTab('scale')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            title="وزن سريع (F3)"
          >
            <span>⚖️</span>
            <span>وزن سريع</span>
          </button>
        )}

        {/* Alerts Notification Button */}
        <button
          onClick={() => setIsAlertsModalOpen(true)}
          className="relative w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100 transition-colors"
          title="التنبيهات الذكية"
        >
          <Bell className="w-4 h-4" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-500 text-white border-2 border-white animate-pulse">
              {totalAlerts}
            </span>
          )}
        </button>

        {/* User Account & Lock Screen Button */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-white text-gray-700 transition-colors cursor-pointer"
            title="تبديل المستخدم أو قفل الشاشة (Ctrl+L)"
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-600'
                  : currentUser?.role === 'employee'
                  ? 'bg-blue-600'
                  : 'bg-emerald-600'
              }`}
            >
              {currentUser?.fullName?.slice(0, 1) || 'م'}
            </div>
            <div className="text-right hidden xl:block">
              <p className="text-xs font-bold text-gray-800 leading-none truncate max-w-[100px]">{currentUser?.fullName}</p>
              <span className="text-[9px] text-gray-400 font-bold">
                {currentUser?.role === 'admin' ? '👑 مدير' : currentUser?.role === 'employee' ? '💼 مشرف' : '🛒 كاشير'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsLocked(true)}
            className="w-7 h-7 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-amber-600 flex items-center justify-center transition-colors"
            title="قفل الشاشة السريع (Ctrl+L)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة (F11)'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
