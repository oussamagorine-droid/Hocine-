import React, { useEffect, useState, useMemo } from 'react';
import {
  Scale,
  Calculator,
  Plus,
  Barcode,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Printer,
} from 'lucide-react';
import { db, executeSaleTransaction } from '../db/db';
import { useApp } from '../context/AppContext';
import { Product, Sale } from '../types';
import { formatCurrency, formatWeight, generateInvoiceNumber } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';

export const ScaleView: React.FC = () => {
  const { settings, currentUser, playBeep, playSuccessSound, triggerRefresh, refreshTrigger, setActiveTab } = useApp();
  const currency = settings.storeCurrency || 'د.ج';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Scale Calculator Inputs
  const [weightValue, setWeightValue] = useState<number>(500); // 500g default
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g');

  // Purchase batch calculator (e.g. bought 10kg for 5000 DZD -> 500 DZD/kg)
  const [batchWeightKg, setBatchWeightKg] = useState<number>(10);
  const [batchTotalCost, setBatchTotalCost] = useState<number>(5000);
  const [batchSellingPricePerKg, setBatchSellingPricePerKg] = useState<number>(650);

  // Quick direct single-item scale sale
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const all = await db.products.toArray();
      const scaleItems = all.filter((p) => p.isScaleItem);
      setProducts(scaleItems);
      if (scaleItems.length > 0 && !selectedProduct) {
        setSelectedProduct(scaleItems[0]);
      }
    }
    load();
  }, [refreshTrigger]);

  // Derived unit cost from batch calculator
  const calculatedCostPerKg = useMemo(() => {
    if (batchWeightKg <= 0) return 0;
    return Math.round((batchTotalCost / batchWeightKg) * 100) / 100;
  }, [batchWeightKg, batchTotalCost]);

  const calculatedBatchProfit = useMemo(() => {
    const totalRevenue = batchWeightKg * batchSellingPricePerKg;
    return totalRevenue - batchTotalCost;
  }, [batchWeightKg, batchSellingPricePerKg, batchTotalCost]);

  const calculatedBatchMargin = useMemo(() => {
    if (calculatedCostPerKg <= 0) return 0;
    return ((batchSellingPricePerKg - calculatedCostPerKg) / calculatedCostPerKg) * 100;
  }, [calculatedCostPerKg, batchSellingPricePerKg]);

  // Real-time sale item price calculation for active product
  const activeWeightKg = weightUnit === 'g' ? weightValue / 1000 : weightValue;
  const activePricePerKg = selectedProduct?.sellingPrice || batchSellingPricePerKg;
  const activeCostPerKg = selectedProduct?.costPrice || calculatedCostPerKg;

  const activeTotalPrice = Math.round(activePricePerKg * activeWeightKg * 100) / 100;
  const activeTotalCost = Math.round(activeCostPerKg * activeWeightKg * 100) / 100;
  const activeProfit = Math.round((activeTotalPrice - activeTotalCost) * 100) / 100;

  // Direct fast single-item weight cash checkout
  const handleDirectScaleCheckout = async () => {
    if (!selectedProduct) return;
    playBeep();

    const now = new Date();
    const invoiceNumber = generateInvoiceNumber('SCALE');

    const saleRecord: Omit<Sale, 'id'> = {
      invoiceNumber,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      createdAt: now.toISOString(),
      customerName: 'زبون ميزان (نقدي سريع)',
      items: [
        {
          productId: selectedProduct.id!,
          productName: selectedProduct.name,
          barcode: selectedProduct.barcode,
          unit: 'kg',
          isScaleItem: true,
          quantity: activeWeightKg,
          weightGrams: Math.round(activeWeightKg * 1000),
          costPrice: selectedProduct.costPrice,
          unitPrice: selectedProduct.sellingPrice,
          discount: 0,
          total: activeTotalPrice,
          profit: activeProfit,
        },
      ],
      subtotal: activeTotalPrice,
      discount: 0,
      tax: 0,
      totalAmount: activeTotalPrice,
      paidAmount: activeTotalPrice,
      remainingDebt: 0,
      paymentMethod: 'cash',
      totalCost: activeTotalCost,
      profit: activeProfit,
      cashierId: currentUser?.id || 1,
      cashierName: currentUser?.fullName || 'كاشير الميزان',
      status: 'completed',
    };

    try {
      const saleId = await executeSaleTransaction(saleRecord);
      playSuccessSound();
      triggerRefresh();
      setCompletedSale({ ...saleRecord, id: saleId });
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Error saving direct scale sale:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/60">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-md shadow-emerald-950">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>نظام البيع بالميزان وتسعير الأوزان الذكي</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              حساب دقيق لتكلفة الكيلوغرام، أرباح الأوزان (غرام / كغ)، وطباعة ملصقات الباركود
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('pos')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>فتح شاشة الكاشير POS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Interactive Weight Calculator & Direct Sell (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Weight Simulation Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>حاسبة وزن الميزان الفورية</span>
            </h3>

            {/* Select Product Dropdown & List */}
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">اختر المنتج الذي يباع بالوزن:</label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((prod) => prod.id === Number(e.target.value));
                  if (p) setSelectedProduct(p);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - سعر البيع: {formatCurrency(p.sellingPrice, currency)}/كغ (المخزون: {p.stockQuantity} كغ)
                  </option>
                ))}
              </select>
            </div>

            {/* Weight Fast Presets */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">
                أوزان سريعة بلمسة واحدة:
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                {[
                  { label: '250 غرام (ربع كيلو)', grams: 250 },
                  { label: '500 غرام (نصف كيلو)', grams: 500 },
                  { label: '750 غرام', grams: 750 },
                  { label: '1.00 كغ (كيلو كامل)', grams: 1000 },
                  { label: '1.250 كغ', grams: 1250 },
                  { label: '1.500 كغ (كيلو ونصف)', grams: 1500 },
                  { label: '2.00 كغ (2 كيلو)', grams: 2000 },
                  { label: '2.500 كغ', grams: 2500 },
                  { label: '3.00 كغ', grams: 3000 },
                  { label: '4.00 كغ', grams: 4000 },
                  { label: '5.00 كغ', grams: 5000 },
                  { label: '10.0 كغ', grams: 10000 },
                ].map((preset) => (
                  <button
                    key={preset.grams}
                    type="button"
                    onClick={() => {
                      setWeightValue(preset.grams);
                      setWeightUnit('g');
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      weightUnit === 'g' && weightValue === preset.grams
                        ? 'bg-emerald-600 border-emerald-500 text-white font-extrabold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Weight Numeric Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">أو اكتب الوزن بدقة:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={weightUnit === 'g' ? '50' : '0.05'}
                  min="1"
                  value={weightValue}
                  onChange={(e) => setWeightValue(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 text-2xl font-mono font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (weightUnit === 'kg') {
                        setWeightValue(Math.round(weightValue * 1000));
                        setWeightUnit('g');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg ${
                      weightUnit === 'g' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    غرام (g)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (weightUnit === 'g') {
                        setWeightValue(weightValue / 1000);
                        setWeightUnit('kg');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg ${
                      weightUnit === 'kg' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    كيلوغرام (kg)
                  </button>
                </div>
              </div>
            </div>

            {/* Realtime Pricing Result Display Panel */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">سعر الكيلوغرام:</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">
                    {formatCurrency(activePricePerKg, currency)} / كغ
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">الوزن المسجل:</p>
                  <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {formatWeight(activeWeightKg, 'kg')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">تكلفة البضاعة المباعة:</p>
                  <p className="text-sm font-bold text-slate-300 mt-0.5">{formatCurrency(activeTotalCost, currency)}</p>
                </div>
                <div>
                  <p className="text-slate-400">الربح الصافي من هذه الوزنة:</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">+{formatCurrency(activeProfit, currency)}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-200">السعر النهائي للزبون:</span>
                <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] tracking-wider">
                  {formatCurrency(activeTotalPrice, currency)}
                </span>
              </div>
            </div>

            {/* Direct Quick Sale Button */}
            <button
              onClick={handleDirectScaleCheckout}
              disabled={!selectedProduct}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-sm shadow-xl shadow-emerald-950 transition-all active:scale-[0.99]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>بيع نقدي فوري مباشر وطباعة الوصل</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Batch Purchasing Cost Calculator & Unit Price Wizard (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Purchase Cost per KG Breakdown Calculator */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>حاسبة تكلفة الشراء وتسعير الكيلوغرام</span>
            </h3>
            <p className="text-xs text-slate-400">
              أدخل كمية الشراء بالجملة وسعر الشراء الإجمالي لحساب تكلفة الكيلو وهامش الربح تلقائياً
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 mb-1 block">كمية الشراء الإجمالية (كغ):</label>
                <input
                  type="number"
                  min="0.1"
                  value={batchWeightKg}
                  onChange={(e) => setBatchWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 mb-1 block">سعر الشراء الإجمالي من المورد ({currency}):</label>
                <input
                  type="number"
                  min="0"
                  value={batchTotalCost}
                  onChange={(e) => setBatchTotalCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 mb-1 block">سعر البيع المقترح للزبون ({currency}/كغ):</label>
                <input
                  type="number"
                  min="0"
                  value={batchSellingPricePerKg}
                  onChange={(e) => setBatchSellingPricePerKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Calculations Result Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>تكلفة الكيلوغرام الواحد (Calculated):</span>
                <span className="font-extrabold text-teal-400 text-sm">
                  {formatCurrency(calculatedCostPerKg, currency)} / كغ
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>هامش الربح التجاري:</span>
                <span className="font-bold text-emerald-400">+{calculatedBatchMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>إجمالي الربح المتوقع عند بيع الصندوق/الشحنة:</span>
                <span className="font-extrabold text-emerald-400">+{formatCurrency(calculatedBatchProfit, currency)}</span>
              </div>
            </div>
          </div>

          {/* Scale Barcode Label Format Info */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-amber-400" />
              <span>تنسيق باركود الميزان الإلكتروني (EAN-13 Scale)</span>
            </h3>
            <p className="text-xs text-slate-400">
              النظام متوافق مع جميع موازين الباركود الإلكترونية (Dibal, Bizerba, CAS, Toledo).
              يبدأ الباركود بالرمز <span className="font-mono text-amber-400 font-bold">20</span> متبوعاً برقم الصنف ثم الوزن بالغرامات.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-xs text-amber-300 font-bold">
              20 0001 0500 4 (طماطم - 500 غرام)
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
