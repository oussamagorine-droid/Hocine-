import JSZip from 'jszip';
import { AppUpdateFile, AppUpdatePackage, StoreSettings } from '../types';

/**
 * Format bytes to readable string (KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parses a ZIP file downloaded from GitHub or AI Studio
 */
export async function parseZipUpdatePackage(file: File): Promise<AppUpdatePackage> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const filesList: AppUpdateFile[] = [];
  let totalSizeBytes = 0;
  let packageJsonData: any = null;
  let metadataJsonData: any = null;
  const detectedChanges: string[] = [];

  const fileEntries = Object.keys(loadedZip.files);

  for (const relativePath of fileEntries) {
    const entry = loadedZip.files[relativePath];
    if (entry.dir) continue;

    // Estimate or get size
    // In JSZip internal format, uncompressed size is stored in _data
    const uncompressedSize = (entry as any)._data?.uncompressedSize || 0;
    totalSizeBytes += uncompressedSize;

    // Determine type
    let type = 'file';
    if (relativePath.endsWith('.tsx') || relativePath.endsWith('.ts')) type = 'typescript';
    else if (relativePath.endsWith('.json')) type = 'json';
    else if (relativePath.endsWith('.css') || relativePath.endsWith('.html')) type = 'web';
    else if (relativePath.match(/\.(png|jpg|jpeg|svg|ico)$/i)) type = 'image';

    // Parse package.json or metadata.json if found
    if (relativePath.endsWith('package.json')) {
      try {
        const content = await entry.async('string');
        packageJsonData = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse package.json inside zip', e);
      }
    } else if (relativePath.endsWith('metadata.json')) {
      try {
        const content = await entry.async('string');
        metadataJsonData = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse metadata.json inside zip', e);
      }
    }

    // Capture small snippets for important files
    let snippet = '';
    if (
      relativePath.endsWith('package.json') ||
      relativePath.endsWith('metadata.json') ||
      relativePath.endsWith('README.md')
    ) {
      try {
        const text = await entry.async('string');
        snippet = text.slice(0, 300);
      } catch (_) {}
    }

    filesList.push({
      name: relativePath,
      size: uncompressedSize,
      type,
      contentSnippet: snippet,
    });
  }

  // Determine App Name and Version
  const appName = metadataJsonData?.name || packageJsonData?.name || file.name.replace(/\.zip$/i, '');
  const version =
    packageJsonData?.version && packageJsonData.version !== '0.0.0'
      ? `v${packageJsonData.version}`
      : `تحديث_${new Date().toISOString().slice(0, 10)}`;

  // Synthesize detected changes
  if (filesList.some((f) => f.name.includes('src/components/'))) {
    detectedChanges.push('تحديث وتطوير واجهات المستخدم والمكونات التفاعلية');
  }
  if (filesList.some((f) => f.name.includes('src/db/'))) {
    detectedChanges.push('تحسينات أمان وتوافق على محرك قاعدة البيانات IndexedDB');
  }
  if (filesList.some((f) => f.name.includes('src/utils/'))) {
    detectedChanges.push('تطوير الدوال الحسابية والتقارير المالية');
  }
  if (metadataJsonData?.description) {
    detectedChanges.push(`وصف الحزمة: ${metadataJsonData.description}`);
  }

  return {
    version,
    appName,
    description: metadataJsonData?.description || 'حزمة تحديث برمجية مصدرية من GitHub / AI Studio',
    buildDate: new Date().toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    filesCount: filesList.length,
    totalSizeBytes: totalSizeBytes || file.size,
    filesList,
    changesSummary: detectedChanges.length > 0 ? detectedChanges : ['تحديث ملفات الشيفرة المصدرية والمكتبات'],
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Parses files chosen directly via folder or multi-file selection
 */
export async function parseMultipleFilesUpdate(fileList: FileList | File[]): Promise<AppUpdatePackage> {
  const files = Array.from(fileList);
  const filesArray: AppUpdateFile[] = [];
  let totalSizeBytes = 0;
  let packageJsonData: any = null;
  let metadataJsonData: any = null;
  const detectedChanges: string[] = [];

  for (const file of files) {
    totalSizeBytes += file.size;
    const relativePath = (file as any).webkitRelativePath || file.name;

    let type = 'file';
    if (relativePath.endsWith('.tsx') || relativePath.endsWith('.ts')) type = 'typescript';
    else if (relativePath.endsWith('.json')) type = 'json';
    else if (relativePath.endsWith('.css') || relativePath.endsWith('.html')) type = 'web';
    else if (relativePath.match(/\.(png|jpg|jpeg|svg|ico)$/i)) type = 'image';

    if (relativePath.endsWith('package.json')) {
      try {
        const text = await file.text();
        packageJsonData = JSON.parse(text);
      } catch (e) {
        console.warn('Failed parsing package.json', e);
      }
    } else if (relativePath.endsWith('metadata.json')) {
      try {
        const text = await file.text();
        metadataJsonData = JSON.parse(text);
      } catch (e) {
        console.warn('Failed parsing metadata.json', e);
      }
    }

    filesArray.push({
      name: relativePath,
      size: file.size,
      type,
    });
  }

  const appName = metadataJsonData?.name || packageJsonData?.name || 'مجلد تحديث المشروع';
  const version =
    packageJsonData?.version && packageJsonData.version !== '0.0.0'
      ? `v${packageJsonData.version}`
      : `تحديث_${new Date().toISOString().slice(0, 10)}`;

  if (filesArray.some((f) => f.name.includes('src/components/'))) {
    detectedChanges.push('تحديث واجهات وشاشات البرنامج');
  }
  if (filesArray.some((f) => f.name.includes('src/db/'))) {
    detectedChanges.push('تطوير مخططات التخزين المحلي');
  }

  return {
    version,
    appName,
    description: metadataJsonData?.description || 'ملفات تحديث مستوردة مباشرة من مجلد المشروع',
    buildDate: new Date().toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    filesCount: filesArray.length,
    totalSizeBytes,
    filesList: filesArray,
    changesSummary: detectedChanges.length > 0 ? detectedChanges : ['تحديث ملفات البرنامج الحالية بالملفات الجديدة'],
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Fetch information about the latest commit or release from GitHub public API
 */
export async function checkGitHubRepo(
  repoFullName: string,
  token?: string
): Promise<{
  success: boolean;
  repoUrl: string;
  latestCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
    downloadZipUrl: string;
  };
  latestRelease?: {
    tag: string;
    name: string;
    publishedAt: string;
    body: string;
    zipUrl: string;
  };
  error?: string;
}> {
  try {
    const cleanRepo = repoFullName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    if (!cleanRepo || !cleanRepo.includes('/')) {
      return {
        success: false,
        repoUrl: repoFullName,
        error: 'يرجى كتابة اسم المستودع بصيغة owner/repository (مثال: OussamaGorine/grocery-pos)',
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    // 1. Check latest commits
    const commitsRes = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=1`, {
      headers,
    });

    if (!commitsRes.ok) {
      if (commitsRes.status === 404) {
        return {
          success: false,
          repoUrl: cleanRepo,
          error: 'المستودع غير موجود أو أنه خاص (Private). إذا كان خاصاً يرجى إدخال GitHub Token.',
        };
      }
      return {
        success: false,
        repoUrl: cleanRepo,
        error: `تعذر الاتصال بـ GitHub API (رمز الاستجابة: ${commitsRes.status})`,
      };
    }

    const commitsData = await commitsRes.json();
    const latest = commitsData[0];

    const latestCommit = latest
      ? {
          sha: latest.sha.substring(0, 7),
          message: latest.commit.message,
          author: latest.commit.author.name,
          date: new Date(latest.commit.author.date).toLocaleDateString('ar-DZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          downloadZipUrl: `https://github.com/${cleanRepo}/archive/refs/heads/main.zip`,
        }
      : undefined;

    // 2. Check releases (optional)
    let latestRelease;
    try {
      const releaseRes = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
        headers,
      });
      if (releaseRes.ok) {
        const rData = await releaseRes.json();
        latestRelease = {
          tag: rData.tag_name,
          name: rData.name || rData.tag_name,
          publishedAt: new Date(rData.published_at).toLocaleDateString('ar-DZ'),
          body: rData.body || '',
          zipUrl: rData.zipball_url,
        };
      }
    } catch (_) {}

    return {
      success: true,
      repoUrl: `https://github.com/${cleanRepo}`,
      latestCommit,
      latestRelease,
    };
  } catch (err: any) {
    return {
      success: false,
      repoUrl: repoFullName,
      error: err.message || 'حدث خطأ في فحص المستودع عبر الإنترنت',
    };
  }
}

/**
 * Apply the update to StoreSettings and browser offline registry
 */
export async function applyUpdateToSystem(
  pkg: AppUpdatePackage,
  currentSettings: StoreSettings,
  updateSettings: (s: StoreSettings) => Promise<void>
): Promise<void> {
  // Update the StoreSettings
  const updatedSettings: StoreSettings = {
    ...currentSettings,
    appVersion: pkg.version,
    lastUpdateDate: new Date().toISOString(),
    lastUpdateSource: `${pkg.appName || 'تحديث النظام'} (${pkg.filesCount} ملف)`,
  };

  await updateSettings(updatedSettings);

  // Store update details in localStorage so it persists across refreshes
  try {
    const updateLog = {
      appliedAt: new Date().toISOString(),
      version: pkg.version,
      appName: pkg.appName,
      filesCount: pkg.filesCount,
      totalSize: pkg.totalSizeBytes,
      changes: pkg.changesSummary,
    };
    localStorage.setItem('pos_last_applied_update', JSON.stringify(updateLog));
  } catch (e) {
    console.warn('Could not save update log to localStorage', e);
  }

  // If Service Worker / Caches are active, clear stale caches to ensure fresh files are fetched
  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        await caches.delete(key);
      }
    } catch (e) {
      console.warn('Cache clearing error', e);
    }
  }
}
