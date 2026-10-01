import React, { useState, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  GitBranch,
  FolderArchive,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Package,
  Layers,
  ShieldCheck,
  Download,
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Database,
  FileText,
  Clock,
  HardDrive,
  Info,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUpdatePackage } from '../types';
import {
  parseZipUpdatePackage,
  parseMultipleFilesUpdate,
  checkGitHubRepo,
  applyUpdateToSystem,
  formatBytes,
} from '../utils/appUpdater';

export const AppUpdateManager: React.FC = () => {
  const { settings, updateSettings, playSuccessSound, triggerRefresh } = useApp();

  // Active Tab for Updater
  const [updateMode, setUpdateMode] = useState<'zip' | 'github' | 'files'>('zip');

  // File Inputs Ref
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [stagedPackage, setStagedPackage] = useState<AppUpdatePackage | null>(null);
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('');
  const [selectedFileFilter, setSelectedFileFilter] = useState<'all' | 'typescript' | 'json' | 'web' | 'image'>('all');
  const [selectedSnippetFile, setSelectedSnippetFile] = useState<string | null>(null);

  // GitHub States
  const [githubRepo, setGithubRepo] = useState<string>(settings.githubRepo || '');
  const [githubToken, setGithubToken] = useState<string>('');
  const [isCheckingGithub, setIsCheckingGithub] = useState<boolean>(false);
  const [githubResult, setGithubResult] = useState<any | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Final Alert
  const [updateAlert, setUpdateAlert] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Handle Drag & Drop
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 1. Process ZIP File
  const handleZipFileSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUpdateAlert({
        type: 'error',
        title: 'صيغة غير مدعومة',
        message: 'يرجى اختيار ملف أرشيف مضغوط بصيغة ZIP يحتوي على ملفات المشروع المحدثة.',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('جاري فك ضغط الأرشيف وقراءة ملفات المشروع...');
    setUpdateAlert(null);

    try {
      const parsedPkg = await parseZipUpdatePackage(file);
      setStagedPackage(parsedPkg);
      playSuccessSound();
      setUpdateAlert({
        type: 'success',
        title: 'تم قراءة حزمة التحديث بنجاح',
        message: `تم اكتشاف ${parsedPkg.filesCount} ملفاً بحجم إجمالي ${formatBytes(
          parsedPkg.totalSizeBytes
        )}. يرجى مراجعة الملفات المحدثة ثم الضغط على زر تطبيق التحديث.`,
      });
    } catch (err: any) {
      console.error('Error reading zip package:', err);
      setUpdateAlert({
        type: 'error',
        title: 'فشل قراءة حزمة التحديث',
        message: err.message || 'حدث خطأ أثناء قراءة ملف ZIP، تأكد من سلامة الملف.',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 2. Process Folder / Multiple Files
  const handleMultipleFilesSelected = async (fileList: FileList) => {
    if (fileList.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`جاري فحص وقراءة ${fileList.length} ملفاً من مجلد المشروع...`);
    setUpdateAlert(null);

    try {
      const parsedPkg = await parseMultipleFilesUpdate(fileList);
      setStagedPackage(parsedPkg);
      playSuccessSound();
      setUpdateAlert({
        type: 'success',
        title: 'تم فحص ملفات التحديث بنجاح',
        message: `تمت قراءة ${parsedPkg.filesCount} ملفاً من المجلد بنجاح، يمكنك الآن اعتمادها وتحديث النظام.`,
      });
    } catch (err: any) {
      console.error('Error reading files:', err);
      setUpdateAlert({
        type: 'error',
        title: 'فشل قراءة الملفات',
        message: 'تعذر استخراج بيانات التحديث من الملفات المحددة.',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // 3. GitHub Check
  const handleCheckGithub = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!githubRepo.trim()) {
      setGithubError('يرجى إدخال اسم مستودع GitHub مثل: OussamaGorine/supermarket-pos');
      return;
    }

    setIsCheckingGithub(true);
    setGithubError(null);
    setGithubResult(null);

    try {
      const res = await checkGitHubRepo(githubRepo, githubToken);
      if (res.success) {
        setGithubResult(res);
        // Save repo in settings for future convenience
        if (githubRepo !== settings.githubRepo) {
          updateSettings({ ...settings, githubRepo: githubRepo.trim() });
        }
      } else {
        setGithubError(res.error || 'تعذر جلب التحديثات من GitHub.');
      }
    } catch (err: any) {
      setGithubError(err.message || 'خطأ في الاتصال بالإنترنت أو واجهة GitHub.');
    } finally {
      setIsCheckingGithub(false);
    }
  };

  // 4. Apply Update to the System
  const handleApplyUpdate = async () => {
    if (!stagedPackage) return;

    setIsProcessing(true);
    setProcessingStatus('جاري تطبيق ملفات التحديث وتثبيت النسخة في النظام وحفظ الإعدادات...');

    try {
      await applyUpdateToSystem(stagedPackage, settings, updateSettings);
      playSuccessSound();
      triggerRefresh();

      setUpdateAlert({
        type: 'success',
        title: '🎉 تم تحديث البرنامج بنجاح!',
        message: `تم ترقية وتحديث البرنامج بنجاح إلى النسخة (${stagedPackage.version}). تم الاحتفاظ بجميع بيانات متجرك والمبيعات والديون بأمان 100%. اضغط على الزر أدناه لإعادة تشغيل البرنامج بالنسخة الجديدة.`,
      });

      // Clear staged
      setStagedPackage(null);
    } catch (err: any) {
      console.error('Failed applying update:', err);
      setUpdateAlert({
        type: 'error',
        title: 'فشل تثبيت التحديث',
        message: err.message || 'حدث خطأ أثناء اعتماد التحديث، يرجى المحاولة ثانية.',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Filtered files list
  const filteredFiles = stagedPackage
    ? stagedPackage.filesList.filter((f) => {
        const matchesSearch = f.name.toLowerCase().includes(fileSearchTerm.toLowerCase());
        const matchesFilter = selectedFileFilter === 'all' || f.type === selectedFileFilter;
        return matchesSearch && matchesFilter;
      })
    : [];

  return (
    <div className="space-y-4 text-xs">
      {/* Overview & Security Card */}
      <div className="bg-gradient-to-l from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>مركز تحديث وترقية البرنامج</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-mono">
                    {settings.appVersion || 'v2.1.0'}
                  </span>
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  قراءة ملفات المشروع المحدثة من GitHub أو AI Studio وتطبيق التعديلات فورياً
                </p>
              </div>
            </div>

            {/* Reassurance Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>بيانات المحل والمبيعات والديون محمية 100% (IndexedDB)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-blue-800/60">
            <div className="flex items-center gap-2 text-blue-200">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>الإصدار الحالي: <b className="text-white font-mono">{settings.appVersion || 'v2.1.0'}</b></span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>آخر تحديث: <b className="text-white font-mono">{settings.lastUpdateDate ? new Date(settings.lastUpdateDate).toLocaleDateString('ar-DZ') : 'أصلي'}</b></span>
            </div>
            <div className="flex items-center gap-2 text-blue-200 truncate">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="truncate">مصدر التحديث: <b className="text-white truncate">{settings.lastUpdateSource || 'AI Studio'}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notification if any */}
      {updateAlert && (
        <div
          className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
            updateAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : updateAlert.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {updateAlert.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : updateAlert.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
              )}
              <h4 className="font-bold text-sm">{updateAlert.title}</h4>
            </div>
            <button
              onClick={() => setUpdateAlert(null)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
          <p className="text-xs leading-relaxed mr-7">{updateAlert.message}</p>
          {updateAlert.type === 'success' && updateAlert.title.includes('تحديث البرنامج بنجاح') && (
            <div className="mr-7 mt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل البرنامج الآن (Reload Application)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200">
        <button
          type="button"
          onClick={() => {
            setUpdateMode('zip');
            setUpdateAlert(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-xs ${
            updateMode === 'zip'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>1. رفع حزمة التحديث (.ZIP من GitHub / AI Studio)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setUpdateMode('github');
            setUpdateAlert(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-xs ${
            updateMode === 'github'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>2. فحص ومزامنة مستودع GitHub مباشرة</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setUpdateMode('files');
            setUpdateAlert(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-xs ${
            updateMode === 'files'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>3. سحب مجلد أو ملفات المشروع</span>
        </button>
      </div>

      {/* TAB 1: ZIP PACKAGE UPLOAD */}
      {updateMode === 'zip' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-blue-600" />
                <span>إدخال حزمة تحديث البرنامج (ملف ZIP)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                حمل الملف المضغوط من زر "Export ZIP" في AI Studio أو عبر زر "Download ZIP" في مستودع GitHub وأدخله هنا.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
              موصى به
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={zipInputRef}
            accept=".zip,application/zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleZipFileSelected(file);
              if (zipInputRef.current) zipInputRef.current.value = '';
            }}
            className="hidden"
          />

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleZipFileSelected(file);
            }}
            onClick={() => zipInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/20'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="font-bold text-gray-800 text-sm">{processingStatus}</p>
                <p className="text-xs text-gray-500">جاري فحص سلامة الملفات وبناء شجرة التحديث...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="font-bold text-gray-800 text-sm mb-1">
                  اسحب وأفلت ملف التحديث (ZIP) هنا أو اضغط للاختيار من جهازك
                </p>
                <p className="text-xs text-gray-500 max-w-md leading-relaxed">
                  يقوم البرنامج بقراءة الحزمة بالكامل، استخراج أسماء ومحتويات الملفات، فحص الإصدار الجديد، وتجهيز النظام للتطبيق الآلي
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-white border border-gray-200 text-[11px] font-mono font-bold text-gray-600 shadow-2xs">
                    يدعم ملفات: *.zip من GitHub و Google AI Studio
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GITHUB DIRECT SYNC */}
      {updateMode === 'github' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-600" />
              <span>المزامنة المباشرة مع مستودع GitHub</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              أدخل رابط أو اسم مستودع مشروعك على GitHub لفحص آخر التعديلات (Commits / Releases) المسجلة وتنزيلها
            </p>
          </div>

          <form onSubmit={handleCheckGithub} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-gray-700 mb-1 block">
                  اسم المستودع على GitHub (Repository Name) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 font-mono text-xs">
                    github.com/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="OussamaGorine/grocery-pos-app"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-24 pl-3 py-2 text-gray-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">
                  رمز الوصول (Personal Token - اختياري)
                </label>
                <input
                  type="password"
                  placeholder="مطلوب فقط إذا كان المستودع Private"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-500">
                يتم الاتصال بـ GitHub API لقراءة آخر تعديلات الكود المصدرية.
              </p>
              <button
                type="submit"
                disabled={isCheckingGithub}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {isCheckingGithub ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري فحص GitHub...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>فحص التحديثات من المستودع</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* GitHub Error */}
          {githubError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{githubError}</span>
            </div>
          )}

          {/* GitHub Success Result Card */}
          {githubResult && (
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-gray-800 text-xs">تم العثور على أحدث نسخة في GitHub:</span>
                </div>
                <a
                  href={githubResult.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-purple-700 hover:underline font-bold text-xs"
                >
                  <span>عرض المستودع على GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {githubResult.latestCommit && (
                <div className="bg-white p-3 rounded-lg border border-purple-100 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      Commit #{githubResult.latestCommit.sha}
                    </span>
                    <span className="text-gray-500">{githubResult.latestCommit.date}</span>
                  </div>
                  <p className="font-bold text-gray-800 text-xs">{githubResult.latestCommit.message}</p>
                  <p className="text-[11px] text-gray-500">المطور: {githubResult.latestCommit.author}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                    <span className="text-[11px] text-emerald-700 font-bold">
                      ✓ التحديث جاهز للتحميل والتطبيق
                    </span>
                    <a
                      href={githubResult.latestCommit.downloadZipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل ملف التحديث (ZIP) من GitHub</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT FOLDER / MULTI-FILE DROP */}
      {updateMode === 'files' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              <span>إدخال مجلد المشروع أو ملفات الشيفرة مباشرة</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              يمكنك اختيار مجلد المشروع المفكوك مباشرة أو تحديد مجموعة الملفات المحدثة ليقوم البرنامج بقراءتها
            </p>
          </div>

          <input
            type="file"
            ref={folderInputRef}
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleMultipleFilesSelected(e.target.files);
              }
              if (folderInputRef.current) folderInputRef.current.value = '';
            }}
            className="hidden"
          />

          <div
            onClick={() => folderInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
              <FileCode className="w-7 h-7" />
            </div>
            <p className="font-bold text-gray-800 text-sm mb-1">
              اضغط لاختيار مجلد المشروع الكامل المحدث من حاسوبك
            </p>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed">
              يقوم المتصفح بقراءة كافة الملفات داخل المجلد وبناء حزمة التحديث التلقائي
            </p>
          </div>
        </div>
      )}

      {/* STAGED UPDATE PACKAGE DETAILS & CONFIRMATION BOX */}
      {stagedPackage && (
        <div className="bg-white border-2 border-blue-500 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping"></span>
                <h3 className="text-base font-bold text-gray-900">
                  حزمة التحديث جاهزة للتطبيق: {stagedPackage.appName}
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                  {stagedPackage.version}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{stagedPackage.description}</p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStagedPackage(null)}
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApplyUpdate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تطبيق التحديث...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد وتطبيق التحديث على البرنامج فوراً</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics of the Package */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 text-[11px]">إجمالي الملفات المقروءة</p>
              <p className="text-base font-bold text-blue-600 mt-0.5">{stagedPackage.filesCount} ملف</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 text-[11px]">الحجم الإجمالي غير المضغوط</p>
              <p className="text-base font-bold text-gray-800 mt-0.5">{formatBytes(stagedPackage.totalSizeBytes)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-gray-500 text-[11px]">تاريخ الإنشاء / التحزيم</p>
              <p className="text-xs font-bold text-gray-700 mt-1">{stagedPackage.buildDate}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
              <p className="text-[11px] font-semibold text-emerald-700">حالة قاعدة بياناتك</p>
              <p className="text-xs font-bold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>محمية بالكامل 100%</span>
              </p>
            </div>
          </div>

          {/* Summary of Changes Detected */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
            <p className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>التعديلات المكتشفة في هذه الحزمة:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 pr-1">
              {stagedPackage.changesSummary?.map((change, idx) => (
                <li key={idx}>{change}</li>
              ))}
            </ul>
          </div>

          {/* Files Explorer & Filter */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-700">قائمة الملفات المكتشفة في الحزمة ({filteredFiles.length}):</span>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="بحث في أسماء الملفات..."
                    value={fileSearchTerm}
                    onChange={(e) => setFileSearchTerm(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg pr-8 pl-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={selectedFileFilter}
                  onChange={(e) => setSelectedFileFilter(e.target.value as any)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="typescript">TypeScript (.tsx / .ts)</option>
                  <option value="json">JSON / إعدادات</option>
                  <option value="web">HTML / CSS</option>
                </select>
              </div>
            </div>

            {/* Scrollable File List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs font-mono">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedSnippetFile(file.contentSnippet ? file.name : null)}
                    className="p-2.5 flex items-center justify-between hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="truncate text-gray-800 font-semibold">{file.name}</span>
                      {file.contentSnippet && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-sans">
                          معاينة
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[11px] shrink-0 font-sans">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 font-sans">
                  لا توجد ملفات تطابق شروط البحث
                </div>
              )}
            </div>

            {/* Snippet viewer if user clicked a file */}
            {selectedSnippetFile && (
              <div className="p-3 bg-gray-900 text-gray-200 border-t border-gray-800 font-mono text-[11px] max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between pb-1 text-gray-400 font-sans text-[10px]">
                  <span>معاينة محتوى: {selectedSnippetFile}</span>
                  <button onClick={() => setSelectedSnippetFile(null)} className="hover:text-white">إغلاق</button>
                </div>
                <pre className="whitespace-pre-wrap">
                  {stagedPackage.filesList.find((f) => f.name === selectedSnippetFile)?.contentSnippet}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOW-TO GUIDE CARD */}
      <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span>خطوات تحديث البرنامج خطوة بخطوة عند التعديل في AI Studio</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-1">
              1
            </div>
            <p className="font-bold text-gray-800 text-xs">تصدير التحديث من AI Studio</p>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              بعد إجراء أي تعديلات هنا على Google AI Studio، قم بالضغط على قائمة الإعدادات واختيار <b>Export to GitHub</b> أو تحميل الملف المضغوط <b>Download as ZIP</b>.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-1">
              2
            </div>
            <p className="font-bold text-gray-800 text-xs">إدخال الملف في شاشة التحديث</p>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              ادخل هنا إلى قسم <b>تحديث البرنامج</b>، ثم اسحب ملف الـ ZIP وضعه في المربع، أو اكتب رابط المستودع على GitHub.
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-1">
              3
            </div>
            <p className="font-bold text-gray-800 text-xs">اعتماد وتطبيق التحديث</p>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              يقوم البرنامج بقراءة كافة الملفات وتطبيق التعديلات البرمجية فورياً، مع بقاء كافة بيانات زبائنك ومبيعاتك مخزنة بأمان.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
