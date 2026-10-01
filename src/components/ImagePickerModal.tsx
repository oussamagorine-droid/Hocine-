import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Check,
  Sparkles,
  Globe,
  Loader2,
  RefreshCw,
  Palette,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import { generateOfflineProductSvg } from '../utils/productImageUtils';
import { searchProductImagesOnline, WebImageResult, isMedicationQuery } from '../utils/onlineImageSearch';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  category: string;
  currentImage: string;
  onSelectImage: (imageUrl: string) => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  onClose,
  productName,
  category,
  currentImage,
  onSelectImage,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [webResults, setWebResults] = useState<WebImageResult[]>([]);
  const [isLoadingWeb, setIsLoadingWeb] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [medicationWarning, setMedicationWarning] = useState<string | null>(null);

  // Execute online Google / Web image search for Algerian grocery items
  const performOnlineSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setWebResults([]);
      setMedicationWarning(null);
      setIsLoadingWeb(false);
      return;
    }

    if (isMedicationQuery(trimmed)) {
      setMedicationWarning(
        '⚠️ تم حظر هذا العنصر: البحث مخصص حصراً لمنتجات وسلع السوبرماركت والتغذية بالجزائر، وتم استبعاد الأدوية والمواد الصيدلانية تلقائياً.'
      );
      setWebResults([]);
      setIsLoadingWeb(false);
      setHasSearched(true);
      return;
    }

    setMedicationWarning(null);
    setIsLoadingWeb(true);
    setHasSearched(true);
    try {
      const results = await searchProductImagesOnline(trimmed, category);
      setWebResults(results);
    } catch (err) {
      console.error('Error searching product images online:', err);
      setWebResults([]);
    } finally {
      setIsLoadingWeb(false);
    }
  }, [category]);

  // Sync search query when modal opens or productName changes
  useEffect(() => {
    if (isOpen) {
      const initialQuery = productName || '';
      setSearchQuery(initialQuery);
      if (initialQuery.trim().length >= 2) {
        performOnlineSearch(initialQuery);
      }
    }
  }, [isOpen, productName, performOnlineSearch]);

  // Debounced auto-search when query changes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performOnlineSearch(searchQuery);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, performOnlineSearch]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onSelectImage(url);
    onClose();
  };

  const offlineSvg = generateOfflineProductSvg(productName || searchQuery || 'منتج', category);

  const algerianSamples = [
    'إفري 1.5 لتر',
    'حليب كانديا',
    'حمود بوعلام سيلكتو',
    'زيت إيليو 5 لتر',
    'طماطم مصبرة عمور',
    'سميد سيم',
    'ياغورت صومام',
    'بسكويت بيمو',
    'شوكولا المرجان',
    'شامبو فينوس',
    'جبن بربر',
    'قهوة بونال',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google Themed Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Google Colorful Logo Representation */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-blue-600 font-black text-lg tracking-tighter">G</span>
              <span className="text-red-500 font-black text-lg tracking-tighter">o</span>
              <span className="text-amber-500 font-black text-lg tracking-tighter">o</span>
              <span className="text-blue-600 font-black text-lg tracking-tighter">g</span>
              <span className="text-emerald-500 font-black text-lg tracking-tighter">l</span>
              <span className="text-red-500 font-black text-lg tracking-tighter">e</span>
              <span className="mr-1 text-xs font-bold text-gray-500 bg-gray-200/80 px-1.5 py-0.5 rounded text-[11px]">صور 🇩🇿</span>
            </div>

            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                <span>البحث المباشر في صور Google للمنتجات الجزائرية</span>
                {productName && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 font-sans font-medium">
                    {productName}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500">
                مخصص لسلع وأغذية السوبرماركت والسوبيرات بالجزائر (تصفية تلقائية لأي عناصر خارج المواد الغذائية)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Style Search Bar */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <div className="absolute right-3.5 top-3 flex items-center gap-1.5 pointer-events-none">
                <Search className="w-4 h-4 text-blue-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    performOnlineSearch(searchQuery);
                  }
                }}
                placeholder="ابحث في Google Images عن منتجات السوبرماركت (مثال: إفري، حليب كانديا، كوكاكولا، سميد سيم، زيت إيليو...)"
                className="w-full bg-white border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 text-gray-900 rounded-full pr-10 pl-24 py-2.5 text-xs focus:outline-none font-medium shadow-xs transition-all"
                autoFocus
              />
              <div className="absolute left-3 top-2.5 flex items-center gap-1.5">
                {isLoadingWeb ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setWebResults([]);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                ) : null}
                <span className="text-[10px] text-gray-400 border-r border-gray-200 pr-1.5">🇩🇿 DZ</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => performOnlineSearch(searchQuery)}
              disabled={isLoadingWeb || !searchQuery.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-xs shrink-0"
            >
              {isLoadingWeb ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>بحث في Google</span>
            </button>

            {/* Offline Vector Badge Button */}
            <button
              type="button"
              onClick={() => handleSelect(offlineSvg)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold transition-all shadow-2xs shrink-0"
              title="توليد شارة متجهة بدون إنترنت"
            >
              <Palette className="w-3.5 h-3.5 text-amber-600" />
              <span>شارة بدون إنترنت</span>
            </button>
          </div>

          {/* Algerian Popular Grocery Quick Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-gray-400 shrink-0 font-medium text-[10px]">منتجات شائعة:</span>
            {algerianSamples.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setSearchQuery(sample);
                  performOnlineSearch(sample);
                }}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 hover:border-blue-300 border border-gray-200 rounded-full shrink-0 transition-colors shadow-2xs font-medium text-[11px]"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Medication Warning Banner */}
        {medicationWarning && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shrink-0 animate-in fade-in">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">{medicationWarning}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                تنبيه أمان: تم حجب نتائج الأدوية والمواد الصيدلانية لضمان دقة وتوافق سلع السوبرماركت والتغذية بالجزائر.
              </p>
            </div>
          </div>
        )}

        {/* Modal Body - Google Image Search Results */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {isLoadingWeb ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 animate-pulse">
                <Globe className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">
                  جارٍ البحث في صور Google وقواعد البيانات الجزائرية عن "{searchQuery || productName}"...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  تصفية فورية وحصرية لمنتجات الأغذية والسوبرماركت
                </p>
              </div>
            </div>
          ) : webResults.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <span>
                    نتائج صور Google لـ "{searchQuery || productName}" ({webResults.length} صورة غذائية):
                  </span>
                </span>
                <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  انقر على أي صورة لتطبيقها على المنتج ونقطة البيع
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {webResults.map((item) => {
                  const isSelected = currentImage === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className={`group relative rounded-2xl border-2 overflow-hidden cursor-pointer bg-white transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col ${
                        isSelected
                          ? 'border-blue-600 ring-4 ring-blue-400/30 shadow-md'
                          : 'border-gray-200 hover:border-blue-500'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative w-full h-34 bg-white flex items-center justify-center p-2.5 border-b border-gray-100 overflow-hidden">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = generateOfflineProductSvg(item.title);
                          }}
                        />

                        {/* Google Images / Algeria Badge */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 text-white backdrop-blur-xs px-2 py-0.5 rounded-md shadow-xs text-[9px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{item.sourceName || 'Google Images 🇩🇿'}</span>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-50">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Label & Details */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                        <p className="font-bold text-xs text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600">
                          {item.title}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px]">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-blue-500" />
                            <span>Google Search</span>
                          </span>
                          <span className={`font-bold ${isSelected ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`}>
                            {isSelected ? '✓ محددة' : 'اختيار الصورة'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-blue-500 shadow-xs">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">
                  {hasSearched
                    ? `لم يتم العثور على صور مطابقة لـ "${searchQuery}" في Google Images`
                    : 'اكتب اسم المنتج للبحث في صور Google'}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  البحث ذكي ومخصص للمنتجات الغذائية والسلع بالجزائر (إفري، كانديا، حمود بوعلام، سيلكتو، زيت إيليو، سيم، عمور بن عمر...)
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-md">
                {algerianSamples.slice(0, 8).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setSearchQuery(sample);
                      performOnlineSearch(sample);
                    }}
                    className="px-3 py-1 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-full text-xs transition-colors shadow-2xs font-medium"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Direct Link Input & Selection */}
        <div className="p-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <span className="font-bold text-gray-700 whitespace-nowrap">رابط صورة مخصص:</span>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/product-image.jpg"
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-800 flex-1 focus:outline-none focus:border-blue-500"
            />
            {customUrl && (
              <button
                type="button"
                onClick={() => handleSelect(customUrl)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shrink-0 transition-colors"
              >
                تطبيق
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
