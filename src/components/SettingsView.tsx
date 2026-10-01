import React, { useState, useRef } from 'react';
import {
  Settings,
  Store,
  Database,
  Download,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Printer,
  CheckCircle2,
  Monitor,
  HardDrive,
  Cpu,
  FileCode,
  ShieldCheck,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Loader2,
  Boxes,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportDatabaseBackup, importDatabaseBackup, resetDatabaseToSeed, clearDatabaseForNewStore, db } from '../db/db';
import { exportCompleteStoreToExcel } from '../utils/excelUtils';
import { StoreSettings } from '../types';
import { AppUpdateManager } from './AppUpdateManager';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, playSuccessSound, triggerRefresh, soundEnabled, toggleSound, setActiveTab } = useApp();

  const [formState, setFormState] = useState<StoreSettings>(settings);
  const [isSavedAlert, setIsSavedAlert] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'update' | 'backup' | 'desktop'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-app Modal & Feedback state (replaces native window.confirm/alert which get blocked in iframes)
  const [activeModal, setActiveModal] = useState<'clear' | 'reset' | 'import' | null>(null);
  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [feedbackAlert, setFeedbackAlert] = useState<{
    type: 'success' | 'error';
    message: string;
    showStoreClearedActions?: boolean;
  } | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formState);
    playSuccessSound();
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3000);
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `نسخة_احتياطية_محل_المواد_الغذائية_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      playSuccessSound();
      setFeedbackAlert({
        type: 'success',
        message: 'تم تحميل ملف النسخة الاحتياطية بنجاح على جهازك!',
      });
    } catch (err) {
      console.error('Backup export error:', err);
      setFeedbackAlert({
        type: 'error',
        message: 'فشل تصدير النسخة الاحتياطية',
      });
    }
  };

  // Import JSON Backup - Trigger Modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingBackupFile(file);
    setActiveModal('import');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute Import Backup
  const executeImportBackup = async () => {
    if (!pendingBackupFile) return;
    setIsProcessingAction(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importDatabaseBackup(content);
        playSuccessSound();
        triggerRefresh();
        setActiveModal(null);
        setPendingBackupFile(null);
        setFeedbackAlert({
          type: 'success',
          message: 'تمت استعادة النسخة الاحتياطية وتحديث قاعدة البيانات بنجاح!',
        });
      } catch (err) {
        console.error('Error importing backup:', err);
        setFeedbackAlert({
          type: 'error',
          message: 'الملف غير صالح أو حدث خطأ أثناء الاستعادة',
        });
      } finally {
        setIsProcessingAction(false);
      }
    };
    reader.readAsText(pendingBackupFile);
  };

  // Execute Clear Store (Start Fresh Store)
  const executeClearStore = async () => {
    setIsProcessingAction(true);
    try {
      await clearDatabaseForNewStore();
      playSuccessSound();
      triggerRefresh();
      setActiveModal(null);
      setFeedbackAlert({
        type: 'success',
        message: 'تم تفريغ وحذف جميع البيانات التجريبية بنجاح! متجرك الآن فارغ 100% (0 منتجات، 0 مبيعات) وجاهز لإدخال سلعك وبياناتك الحقيقية.',
        showStoreClearedActions: true,
      });
    } catch (err) {
      console.error('Error clearing store data:', err);
      setFeedbackAlert({
        type: 'error',
        message: 'حدث خطأ أثناء محاولة تفريغ قاعدة البيانات، يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Export full store to Excel
  const handleExportExcelStore = async () => {
    try {
      const [products, sales, customers, suppliers] = await Promise.all([
        db.products.toArray(),
        db.sales.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
      ]);
      exportCompleteStoreToExcel(products, sales, customers, suppliers);
      playSuccessSound();
      setFeedbackAlert({
        type: 'success',
        message: 'تم تصدير ملف Excel الشامل بنجاح!',
      });
    } catch (err) {
      console.error(err);
      setFeedbackAlert({
        type: 'error',
        message: 'حدث خطأ أثناء تصدير ملف Excel',
      });
    }
  };

  // Execute Reset to Demo Seed
  const executeResetData = async () => {
    setIsProcessingAction(true);
    try {
      await resetDatabaseToSeed();
      playSuccessSound();
      triggerRefresh();
      setActiveModal(null);
      setFeedbackAlert({
        type: 'success',
        message: 'تمت استعادة البيانات النموذجية الافتراضية (Demo Data) بنجاح!',
      });
    } catch (err) {
      console.error('Error resetting database:', err);
      setFeedbackAlert({
        type: 'error',
        message: 'حدث خطأ أثناء استعادة البيانات التجريبية.',
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F1F3F6]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>إعدادات المحل والنسخ الاحتياطي وتصدير EXE</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            تخصيص بيانات الفاتورة، العملة، إدارة الأمان والنسخ الاحتياطي المحلي
          </p>
        </div>

        {isSavedAlert && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم حفظ الإعدادات بنجاح</span>
          </div>
        )}
      </div>

      {/* Prominent In-App Feedback Notification Banner */}
      {feedbackAlert && (
        <div
          className={`p-4 rounded-xl border shadow-xs transition-all flex flex-col gap-3 ${
            feedbackAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {feedbackAlert.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="text-xs font-bold leading-relaxed">{feedbackAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackAlert(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {feedbackAlert.showStoreClearedActions && (
            <div className="flex items-center gap-2 pt-2 border-t border-emerald-200 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs active:scale-95"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>إضافة منتجاتك الخاصة الآن</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-xs active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>استيراد البضائع من ملف Excel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeSettingsTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>هوية المحل والفاتورة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('update')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap relative ${
            activeSettingsTab === 'update'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>تحديث وترقية البرنامج (من GitHub / ملفات AI Studio)</span>
          <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-400 text-amber-950 font-black">
            جديد
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeSettingsTab === 'backup'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>النسخ الاحتياطي وقاعدة البيانات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('desktop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeSettingsTab === 'desktop'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>تصدير كبرنامج سطح مكتب (Windows EXE)</span>
        </button>
      </div>

      {/* VIEW 1: UPDATE PROGRAM MANAGER */}
      {activeSettingsTab === 'update' && (
        <AppUpdateManager />
      )}

      {/* VIEW 2: STORE PROFILE & RECEIPT SETTINGS */}
      {activeSettingsTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN: Store Profile & Receipt Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 p-5 rounded-xl space-y-4 text-xs shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" />
                <span>بيانات المحل وهوية الفاتورة المطبوعة</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 mb-1 block">اسم المحل التجاري *</label>
                  <input
                    type="text"
                    required
                    value={formState.storeName}
                    onChange={(e) => setFormState({ ...formState, storeName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 block">رقم هاتف المحل *</label>
                  <input
                    type="text"
                    required
                    value={formState.storePhone}
                    onChange={(e) => setFormState({ ...formState, storePhone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 mb-1 block">عنوان المحل:</label>
                  <input
                    type="text"
                    value={formState.storeAddress}
                    onChange={(e) => setFormState({ ...formState, storeAddress: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 block">رمز العملة النقدية *</label>
                  <input
                    type="text"
                    required
                    value={formState.storeCurrency}
                    onChange={(e) => setFormState({ ...formState, storeCurrency: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-blue-600 font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 block">تنبيه انتهاء الصلاحية قبل (أيام) *</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    required
                    value={formState.expiryAlertDays}
                    onChange={(e) => setFormState({ ...formState, expiryAlertDays: Number(e.target.value) || 30 })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 mb-1 block">ترويسة الفاتورة (Header Note):</label>
                  <input
                    type="text"
                    value={formState.receiptHeader}
                    onChange={(e) => setFormState({ ...formState, receiptHeader: e.target.value })}
                    placeholder="أهلاً وسهلاً بكم في متجرنا"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 mb-1 block">خاتمة الفاتورة (Footer Note):</label>
                  <input
                    type="text"
                    value={formState.receiptFooter}
                    onChange={(e) => setFormState({ ...formState, receiptFooter: e.target.value })}
                    placeholder="البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Startup & Security Options */}
                <div className="sm:col-span-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span>طلب تسجيل الدخول برمز PIN عند فتح البرنامج</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        عند فتح التطبيق، تظهر شاشة قفل PIN تلقائياً لاختيار الكاشير وتأمين نقطة البيع
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.requirePinOnStartup || false}
                        onChange={(e) => setFormState({ ...formState, requirePinOnStartup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">الشاشة الافتراضية عند فتح البرنامج:</label>
                      <select
                        value={formState.startupTab || 'pos'}
                        onChange={(e) => setFormState({ ...formState, startupTab: e.target.value as any })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="pos">نقطة البيع والكاشير السريع (POS)</option>
                        <option value="dashboard">لوحة التحكم والإحصائيات العامة</option>
                        <option value="scale">شاشة وزن البضاعة والميزان</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">قفل الشاشة التلقائي عند عدم النشاط:</label>
                      <select
                        value={formState.autoLockMinutes || 0}
                        onChange={(e) => setFormState({ ...formState, autoLockMinutes: Number(e.target.value) })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value={0}>معطل (لا تقفل تلقائياً)</option>
                        <option value={1}>بعد دقيقة واحدة من الخمول</option>
                        <option value={3}>بعد 3 دقائق من الخمول</option>
                        <option value={5}>بعد 5 دقائق من الخمول</option>
                        <option value={10}>بعد 10 دقائق من الخمول</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">الأصوات والمؤثرات الصوتية (Beep Sound)</p>
                    <p className="text-[11px] text-gray-500">إصدار صوت عند مسح الباركود وإتمام عمليات البيع</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`p-2 rounded-lg border transition-colors ${
                      soundEnabled
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99]"
              >
                حفظ وتطبيق إعدادات المحل
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Quick Promotion Card & Backup Link (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Update Callout Card */}
            <div className="bg-gradient-to-l from-blue-900 to-indigo-900 text-white p-5 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm">تحديث وترقية البرنامج</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-bold text-[10px]">
                  جديد
                </span>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                هل قمت بتحديث الكود في <b>Google AI Studio</b> أو شاركته على <b>GitHub</b>؟
                يمكنك الآن إدخال حزمة التحديث (ملف ZIP أو مجلد المشروع) ليقوم البرنامج بقراءتها وتطبيق كافة التعديلات فورياً دون مساس ببيانات زبائنك ومبيعاتك.
              </p>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('update')}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>فتح مركز تحديث وترقية البرنامج الآن</span>
              </button>
            </div>

            {/* Quick Backup Overview Card */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-3 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>النسخ الاحتياطي السريع</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab('backup')}
                  className="text-blue-600 hover:underline font-bold text-xs"
                >
                  إدارة شاملة
                </button>
              </div>
              <p className="text-gray-600 leading-relaxed">
                جميع بياناتك مخزنة محلياً في IndexedDB داخل متصفحك. ننصح بتحميل نسخة احتياطية دورياً.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold shadow-2xs transition-all active:scale-95"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>تحميل نسخة احتياطية سريعة (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: BACKUP & DATABASE MANAGEMENT */}
      {activeSettingsTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Backup & Restore Card */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-4 text-xs shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>النسخ الاحتياطي المحلي والأمان (Offline Backup)</span>
            </h3>
            <p className="text-gray-600 leading-relaxed">
              جميع بياناتك (المنتجات، المبيعات، حسابات الديون، الموردين) محفوظة محلياً على جهازك بشكل دائم.
              يمكنك تصدير نسخة احتياطية في أي وقت ونقلها إلى جهاز آخر.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تحميل نسخة احتياطية كاملة (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcelStore}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all active:scale-95 text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير قاعدة بيانات المتجر إلى ملف Excel (.xlsx)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-bold transition-all active:scale-95 shadow-2xs"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>استعادة نسخة احتياطية من ملف</span>
              </button>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('clear')}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold transition-all active:scale-95 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>تفريغ وحذف البيانات التجريبية (بدء متجر فارغ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('reset')}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200 transition-colors text-[11px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استرجاع البيانات التجريبية الافتراضية (Demo Data)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Database Security Information */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-3 text-xs shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>مواصفات وتأمين قاعدة البيانات المحلية</span>
            </h3>
            <p className="text-gray-600 leading-relaxed">
              تعتمد منظومة POS على محرك <b>IndexedDB (Dexie.js)</b> الداخلي فائق السرعة، مما يضمن:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 pr-1">
              <li><b>استقلالية كاملة:</b> لا تتطلب وجود سيرفر خارجي أو اتصال بالإنترنت أثناء البيع والمحاسبة.</li>
              <li><b>سرعة استجابة فائقة:</b> عمليات الإدراج والاستعلام تتم في أجزاء من الألف من الثانية.</li>
              <li><b>حماية من فقدان البيانات:</b> البيانات تبقى محفوظة حتى عند إغلاق المتصفح أو إطفاء الحاسوب.</li>
            </ul>
          </div>
        </div>
      )}

      {/* VIEW 4: DESKTOP WINDOWS EXE ARCHITECTURE */}
      {activeSettingsTab === 'desktop' && (
        <div className="bg-white border border-gray-200 p-6 rounded-xl space-y-4 text-xs shadow-xs max-w-3xl">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-600" />
            <span>بناء وتصدير برنامج سطح المكتب (Windows Standalone EXE)</span>
          </h3>
          <p className="text-gray-600 leading-relaxed">
            هذا المشروع مصمم بهيكل برمجي احترافي متوافق للتحزيم كبرنامج سطح مكتب Desktop حقيقي يعمل على أجهزة الكاشير بدون أي متصفح وبشكل مستقل:
          </p>

          <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 font-mono text-xs text-emerald-400 space-y-2">
            <p className="text-gray-400"># خطوات تصدير ملف EXE على حاسوبك:</p>
            <p className="text-gray-100">1. npm install</p>
            <p className="text-gray-100">2. npm run build</p>
            <p className="text-gray-100">3. npx electron-builder --win</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600 pt-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>يعمل 100% بدون إنترنت (Offline-First) وبأداء مستقر وسريع جداً.</span>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL (Reliable, never blocked by iframe) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 duration-200 text-right">
            {activeModal === 'clear' && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      تفريغ وحذف البيانات التجريبية (بدء متجر فارغ)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      تجهيز المحل لإدخال بياناتك وسلعك الحقيقية
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>تنبيه هام ومؤكد:</span>
                  </div>
                  <p className="leading-relaxed">
                    سيتم مسح وحذف كافة المنتجات، حركات المخزون، سجلات المبيعات، فواتير المشتريات، وحسابات الديون والزبائن والموردين التجريبية بالكامل.
                  </p>
                  <p className="font-semibold text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                    ✓ ستبقى إعدادات المتجر وحساب المدير الإداري محفوظة، وسيصبح البرنامج نظيفاً 100% وجاهزاً لإدخال بضائعك أو استيرادها من Excel.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    إلغاء الأمر
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={executeClearStore}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    {isProcessingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ التفريغ والتنظيف...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>نعم، تفريغ وحذف البيانات التجريبية الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {activeModal === 'reset' && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      استرجاع البيانات النموذجية (Demo Data)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      إعادة تعبئة سلع ومبيعات وموردي التجربة
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <p className="leading-relaxed">
                    سيتم استبدال البيانات الحالية ببيانات البقالة النموذجية الافتراضية كاملة لاختبار كافة خصائص البيع والشراء والتقارير.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={executeResetData}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    {isProcessingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ استرجاع البيانات...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>استرجاع البيانات النموذجية</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {activeModal === 'import' && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      استعادة نسخة احتياطية من ملف
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      الملف المختار: <span className="font-mono text-blue-600 font-bold">{pendingBackupFile?.name}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
                  <p className="leading-relaxed">
                    تنبيه: استعادة نسخة احتياطية سيقوم باستبدال قاعدة البيانات الحالية بالبيانات الموجودة في الملف المختار.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => {
                      setActiveModal(null);
                      setPendingBackupFile(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={executeImportBackup}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  >
                    {isProcessingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ الاستعادة...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>نعم، استعادة النسخة الاحتياطية</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
