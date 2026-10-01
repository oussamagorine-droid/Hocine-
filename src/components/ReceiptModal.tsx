import React, { useEffect } from 'react';
import { Printer, X, Check, Download } from 'lucide-react';
import { Sale, StoreSettings } from '../types';
import { formatCurrency, formatWeight } from '../utils/formatters';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, settings, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleReceiptKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleReceiptKeyDown);
    return () => window.removeEventListener('keydown', handleReceiptKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = settings.storeCurrency || 'د.ج';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-800">معاينة وطباعة الفاتورة #{sale.invoiceNumber}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview Area (White thermal paper look) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
          <div
            id="printable-receipt"
            className="printable-receipt bg-white text-black p-5 rounded-lg shadow-md w-full max-w-[340px] font-mono text-xs leading-relaxed"
            dir="rtl"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <h2 className="text-base font-extrabold text-black">{settings.storeName || 'محل المواد الغذائية'}</h2>
              {settings.storePhone && <p className="text-[11px] text-gray-700">هاتف: {settings.storePhone}</p>}
              {settings.storeAddress && <p className="text-[10px] text-gray-600">{settings.storeAddress}</p>}
              {settings.receiptHeader && (
                <p className="text-[10px] text-gray-600 mt-1 whitespace-pre-line">{settings.receiptHeader}</p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>
                  {sale.date} {sale.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span>{sale.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>الزبون:</span>
                <span className="font-bold">{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold">
                  {sale.paymentMethod === 'cash'
                    ? 'نقداً'
                    : sale.paymentMethod === 'credit'
                    ? 'دين / على الحساب'
                    : sale.paymentMethod === 'partial'
                    ? 'دفع جزئي + دين'
                    : 'بطاقة'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full my-2 text-right border-b border-dashed border-gray-400 pb-2">
              <thead>
                <tr className="border-b border-gray-300 text-[10px] font-bold">
                  <th className="py-1">المنتج</th>
                  <th className="py-1 text-center">الكمية/الوزن</th>
                  <th className="py-1 text-left">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px]">
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1 font-sans font-semibold">{item.productName}</td>
                    <td className="py-1 text-center">
                      {item.isScaleItem
                        ? `${item.quantity} كغ`
                        : `${item.quantity} ${item.unit === 'piece' ? 'قطعة' : item.unit}`}
                      <span className="block text-[9px] text-gray-500 font-mono">
                        @{item.unitPrice} {currency}
                      </span>
                    </td>
                    <td className="py-1 text-left font-bold">{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px] py-1">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(sale.subtotal, currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>الخصم:</span>
                  <span>-{formatCurrency(sale.discount, currency)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between">
                  <span>الضريبة:</span>
                  <span>+{formatCurrency(sale.tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-black pt-1 mt-1">
                <span>الإجمالي النهائي:</span>
                <span>{formatCurrency(sale.totalAmount, currency)}</span>
              </div>

              <div className="flex justify-between pt-1 text-gray-700">
                <span>المبلغ المدفوع:</span>
                <span className="font-bold">{formatCurrency(sale.paidAmount, currency)}</span>
              </div>

              {sale.paymentMethod === 'cash' && sale.paidAmount > sale.totalAmount && (
                <div className="flex justify-between text-gray-700 font-bold">
                  <span>الباقي للزبون:</span>
                  <span>{formatCurrency(sale.paidAmount - sale.totalAmount, currency)}</span>
                </div>
              )}

              {sale.remainingDebt > 0 && (
                <div className="flex justify-between text-rose-800 font-extrabold border-t border-dashed border-gray-400 pt-1">
                  <span>المتبقي كدين على الزبون:</span>
                  <span>{formatCurrency(sale.remainingDebt, currency)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-dashed border-gray-400 mt-2">
              <p className="text-[10px] text-gray-700 whitespace-pre-line">
                {settings.receiptFooter || 'شكراً لزيارتكم ونسعد بخدمتكم'}
              </p>
              <div className="mt-2 text-[9px] text-gray-400">
                <span>*** نظام نقاط البيع POS ***</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
          >
            إغلاق للزبون التالي (Enter ↵)
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإيصال (Ctrl + P)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
