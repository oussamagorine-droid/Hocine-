import React from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Package,
  PackageX,
  Clock,
  CreditCard,
  TrendingDown,
  CheckCircle2,
  ChevronLeft,
  Volume2,
  VolumeX,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AlertsModal: React.FC = () => {
  const {
    alerts,
    isAlertsModalOpen,
    setIsAlertsModalOpen,
    setActiveTab,
    triggerRefresh,
    soundEnabled,
    toggleSound,
    playBeep,
  } = useApp();

  if (!isAlertsModalOpen) return null;

  const totalAlerts = alerts.reduce((acc, a) => acc + a.count, 0);

  const handleNavigate = (category: string) => {
    setIsAlertsModalOpen(false);
    switch (category) {
      case 'low_stock':
        setActiveTab('products');
        break;
      case 'expired':
      case 'near_expiry':
      case 'stagnant':
        setActiveTab('stagnant_expiry');
        break;
      case 'customer_debt':
        setActiveTab('debts');
        break;
      default:
        setActiveTab('dashboard');
    }
  };

  const getAlertIcon = (category: string) => {
    switch (category) {
      case 'low_stock':
        return <PackageX className="w-5 h-5 text-amber-500" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'near_expiry':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'customer_debt':
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'stagnant':
        return <TrendingDown className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      dir="rtl"
      onClick={() => setIsAlertsModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-l from-gray-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">مركز التنبيهات والإشعارات الذكية</h3>
              <p className="text-[11px] text-gray-300">
                {totalAlerts > 0
                  ? `يوجد ${totalAlerts} تنبيه يتطلب انتباهك`
                  : 'جميع مؤشرات المحل تعمل بشكل ممتاز'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerRefresh();
                playBeep();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="تحديث التنبيهات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAlertsModalOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {alerts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">لا توجد أي تنبيهات حالياً</h4>
              <p className="text-xs text-gray-500 max-w-xs">
                المخزون متوفر بالكامل، لا توجد منتجات منتهية الصلاحية أو ديون متراكمة حرجة.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all hover:shadow-xs ${
                  alert.type === 'danger'
                    ? 'bg-red-50/70 border-red-200 hover:border-red-300'
                    : alert.type === 'warning'
                    ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                    : 'bg-blue-50/70 border-blue-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-white shadow-2xs shrink-0 mt-0.5">
                    {getAlertIcon(alert.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-xs text-gray-900">{alert.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          alert.type === 'danger'
                            ? 'bg-red-600 text-white'
                            : alert.type === 'warning'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {alert.count}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigate(alert.category)}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95"
                >
                  <span>عرض التفاصيل</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium py-1 px-2 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>المؤثرات الصوتية مفعلة</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-gray-400" />
                <span>المؤثرات الصوتية معطلة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAlertsModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold transition-all active:scale-95"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
