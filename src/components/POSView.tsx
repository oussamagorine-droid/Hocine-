import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Search,
  Barcode,
  Scale,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CreditCard,
  Banknote,
  Percent,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  X,
  Printer,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { db, executeSaleTransaction } from '../db/db';
import { useApp } from '../context/AppContext';
import { Category, Customer, HeldCart, PaymentMethod, Product, Sale, SaleItem } from '../types';
import { formatCurrency, formatWeight, generateInvoiceNumber, getLocalDateStr } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import { getSmartProductImage, generateOfflineProductSvg } from '../utils/productImageUtils';

export const POSView: React.FC = () => {
  const {
    settings,
    currentUser,
    heldCarts,
    saveHeldCart,
    removeHeldCart,
    playBeep,
    playSuccessSound,
    triggerRefresh,
    refreshTrigger,
  } = useApp();

  const currency = settings.storeCurrency || 'د.ج';

  // DB Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [lastScannedItem, setLastScannedItem] = useState<{
    name: string;
    price: number;
    unit?: string;
    quantity?: number;
    isScaleItem?: boolean;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  // Scale Modal State
  const [scaleProduct, setScaleProduct] = useState<Product | null>(null);
  const [scaleWeight, setScaleWeight] = useState<number>(500); // in grams by default
  const [scaleUnit, setScaleUnit] = useState<'g' | 'kg'>('g');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // New Customer Modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerAddress, setNewCustomerAddress] = useState<string>('');

  // Receipt Modal after completed transaction
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Input refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const checkoutOpenedAt = useRef<number>(0);

  // Load products, categories, customers
  useEffect(() => {
    async function load() {
      const [p, c, cust] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.customers.toArray(),
      ]);
      setProducts(p);
      setCategories(c);
      setCustomers(cust);
    }
    load();
  }, [refreshTrigger]);

  // Focus search input on mount and on shortcuts
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 to focus barcode search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // F12 to checkout
      if (e.key === 'F12' && cart.length > 0) {
        e.preventDefault();
        openCheckout();
        return;
      }

      // ENTER key to checkout if cart has items and no modal is open
      if (
        e.key === 'Enter' &&
        cart.length > 0 &&
        !isPaymentModalOpen &&
        !scaleProduct &&
        !isNewCustomerModalOpen &&
        !isReceiptOpen
      ) {
        // If focus is currently in barcode search input and it has text, let the search form handle adding the product first
        if (document.activeElement === searchInputRef.current && searchQuery.trim().length > 0) {
          return;
        }

        e.preventDefault();
        openCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, scaleProduct, isNewCustomerModalOpen, isReceiptOpen, searchQuery]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'الكل' || p.category === selectedCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - cartDiscount);
  }, [subtotal, cartDiscount]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  }, [cart]);

  const totalProfit = useMemo(() => {
    return totalAmount - totalCost;
  }, [totalAmount, totalCost]);

  // Add Packaged product to cart (or increase quantity if already in cart)
  const addPackagedProduct = (product: Product) => {
    playBeep();
    setLastScannedItem({
      name: product.name,
      price: product.sellingPrice,
      unit: product.unit,
      quantity: 1,
      isScaleItem: false,
    });
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = item.quantity + 1;
        const newTotal = newQty * item.unitPrice - item.discount;
        const newProfit = newTotal - newQty * item.costPrice;
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          total: Math.round(newTotal * 100) / 100,
          profit: Math.round(newProfit * 100) / 100,
        };
        return updated;
      } else {
        const itemTotal = product.sellingPrice;
        const itemProfit = itemTotal - product.costPrice;
        return [
          ...prev,
          {
            productId: product.id!,
            productName: product.name,
            barcode: product.barcode,
            unit: product.unit,
            isScaleItem: false,
            quantity: 1,
            costPrice: product.costPrice,
            unitPrice: product.sellingPrice,
            discount: 0,
            total: itemTotal,
            profit: itemProfit,
          },
        ];
      }
    });
  };

  // Open Scale Modal for weight item
  const openScaleModal = (product: Product) => {
    setScaleProduct(product);
    setScaleWeight(500); // 500g default
    setScaleUnit('g');
  };

  // Confirm Scale weight & Add to Cart
  const confirmScaleAdd = () => {
    if (!scaleProduct) return;
    playBeep();

    const weightInKg = scaleUnit === 'g' ? scaleWeight / 1000 : scaleWeight;
    const itemTotal = Math.round(scaleProduct.sellingPrice * weightInKg * 100) / 100;
    const itemCost = Math.round(scaleProduct.costPrice * weightInKg * 100) / 100;
    const itemProfit = Math.round((itemTotal - itemCost) * 100) / 100;

    setLastScannedItem({
      name: scaleProduct.name,
      price: itemTotal,
      unit: 'kg',
      quantity: weightInKg,
      isScaleItem: true,
    });

    setCart((prev) => [
      ...prev,
      {
        productId: scaleProduct.id!,
        productName: scaleProduct.name,
        barcode: scaleProduct.barcode,
        unit: 'kg',
        isScaleItem: true,
        quantity: weightInKg,
        weightGrams: Math.round(weightInKg * 1000),
        costPrice: scaleProduct.costPrice,
        unitPrice: scaleProduct.sellingPrice,
        discount: 0,
        total: itemTotal,
        profit: itemProfit,
      },
    ]);

    setScaleProduct(null);
    searchInputRef.current?.focus();
  };

  // Handle Barcode Scan / Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      if (cart.length > 0) {
        openCheckout();
      }
      return;
    }

    // Exact barcode match first
    const exactBarcode = products.find((p) => p.barcode.toLowerCase() === query.toLowerCase());
    if (exactBarcode) {
      if (exactBarcode.isScaleItem) {
        openScaleModal(exactBarcode);
      } else {
        addPackagedProduct(exactBarcode);
      }
      setSearchQuery('');
      return;
    }

    // Single result match
    if (filteredProducts.length === 1) {
      const prod = filteredProducts[0];
      if (prod.isScaleItem) {
        openScaleModal(prod);
      } else {
        addPackagedProduct(prod);
      }
      setSearchQuery('');
      return;
    }
  };

  // Update item quantity in cart
  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newTotal = Math.round((newQty * item.unitPrice - item.discount) * 100) / 100;
      const newProfit = Math.round((newTotal - newQty * item.costPrice) * 100) / 100;
      updated[index] = {
        ...item,
        quantity: Math.round(newQty * 1000) / 1000,
        total: newTotal,
        profit: newProfit,
      };
      return updated;
    });
  };

  // Remove item from cart
  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear Cart
  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCartDiscount(0);
    setSelectedCustomerId(undefined);
    setNotes('');
  };

  // Park / Hold Cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const held: HeldCart = {
      id: Date.now().toString(),
      name: cust ? cust.name : `زبون #${heldCarts.length + 1}`,
      time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      items: cart,
      customerId: selectedCustomerId,
      customerName: cust ? cust.name : 'زبون عابر',
      discount: cartDiscount,
    };
    saveHeldCart(held);
    clearCart();
    playSuccessSound();
  };

  // Resume Held Cart
  const resumeHeldCart = (held: HeldCart) => {
    setCart(held.items);
    setSelectedCustomerId(held.customerId);
    setCartDiscount(held.discount || 0);
    removeHeldCart(held.id);
  };

  // Open Checkout
  const openCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('cash');
    setPaidAmount(totalAmount);
    setIsPaymentModalOpen(true);
    checkoutOpenedAt.current = Date.now();
  };

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    const customer = customers.find((c) => c.id === selectedCustomerId);

    // Validate Debt / Credit requirement
    if ((paymentMethod === 'credit' || paymentMethod === 'partial') && !selectedCustomerId) {
      alert('يجب تحديد الزبون عند البيع بالدين أو الدفع الجزئي لتسجيل المبلغ على حسابه!');
      return;
    }

    const calculatedRemainingDebt =
      paymentMethod === 'credit'
        ? totalAmount
        : paymentMethod === 'partial'
        ? Math.max(0, totalAmount - paidAmount)
        : 0;

    const finalPaid =
      paymentMethod === 'credit'
        ? 0
        : paymentMethod === 'partial'
        ? paidAmount
        : paidAmount >= totalAmount
        ? totalAmount
        : paidAmount;

    const invoiceNumber = generateInvoiceNumber('INV');
    const now = new Date();

    const saleRecord: Omit<Sale, 'id'> = {
      invoiceNumber,
      date: getLocalDateStr(now),
      time: now.toTimeString().split(' ')[0],
      createdAt: now.toISOString(),
      customerId: selectedCustomerId,
      customerName: customer ? customer.name : 'زبون عابر (نقدي)',
      customerPhone: customer?.phone,
      items: cart,
      subtotal,
      discount: cartDiscount,
      tax: 0,
      totalAmount,
      paidAmount: finalPaid,
      remainingDebt: calculatedRemainingDebt,
      paymentMethod,
      totalCost,
      profit: totalProfit,
      cashierId: currentUser?.id || 1,
      cashierName: currentUser?.fullName || 'الكاشير',
      status: 'completed',
      notes,
    };

    try {
      const saleId = await executeSaleTransaction(saleRecord);
      playSuccessSound();
      triggerRefresh();

      const savedSale: Sale = { ...saleRecord, id: saleId };
      setCompletedSale(savedSale);
      setIsPaymentModalOpen(false);
      clearCart();

      // Show receipt modal
      setIsReceiptOpen(true);
    } catch (err) {
      console.error('Error executing sale:', err);
      alert('حدث خطأ أثناء حفظ الفاتورة');
    }
  };

  // Shortcut to complete sale on Enter (or close on Escape) when Payment Modal is open
  useEffect(() => {
    if (!isPaymentModalOpen) return;

    const handleCheckoutKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Prevent accidental trigger from the very first Enter that opened the modal
        if (Date.now() - checkoutOpenedAt.current < 200) return;
        e.preventDefault();
        handleCompleteSale();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsPaymentModalOpen(false);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleCheckoutKey);
    return () => window.removeEventListener('keydown', handleCheckoutKey);
  }, [isPaymentModalOpen, handleCompleteSale]);

  // Shortcut for scale modal Enter / Escape
  useEffect(() => {
    if (!scaleProduct) return;

    const handleScaleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmScaleAdd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setScaleProduct(null);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleScaleKey);
    return () => window.removeEventListener('keydown', handleScaleKey);
  }, [scaleProduct, confirmScaleAdd]);

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert('يرجى كتابة اسم الزبون ورقم هاتفه');
      return;
    }

    const newCust: Omit<Customer, 'id'> = {
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      address: newCustomerAddress.trim(),
      totalSpent: 0,
      totalDebt: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
    };

    const id = await db.customers.add(newCust as Customer);
    setSelectedCustomerId(id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setIsNewCustomerModalOpen(false);
    triggerRefresh();
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F1F3F6] select-none">
      {/* ========================================================================= */}
      {/* TOP GIANT GREEN DIGITAL CUSTOMER PRICE DISPLAY (شاشة الزبون الرقمية) */}
      {/* ========================================================================= */}
      <div className="bg-gray-950 border-b-2 border-gray-800 p-2.5 sm:p-3 text-white shadow-lg shrink-0">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 sm:gap-3">
          {/* Left / Center: Last Scanned Item Name & Giant Green Digital Selling Price */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 bg-black/75 border border-emerald-500/40 rounded-xl px-3.5 py-2 shadow-[inset_0_0_15px_rgba(16,185,129,0.18)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                  {lastScannedItem ? 'ثمن بيع السلعة الحالية' : 'شاشة الزبون الرقمية 🛒'}
                </span>
              </div>
              <p className="text-xs sm:text-sm md:text-base font-extrabold text-gray-100 truncate mt-0.5">
                {lastScannedItem ? lastScannedItem.name : 'مرحباً بكم - جاهز لمسح المنتجات'}
              </p>
              {lastScannedItem && (
                <span className="text-[10px] text-gray-400 font-mono">
                  {lastScannedItem.isScaleItem
                    ? `وزن: ${formatWeight(lastScannedItem.quantity || 1, 'kg')}`
                    : `كمية: ${lastScannedItem.quantity || 1} ${lastScannedItem.unit || 'قطعة'}`}
                </span>
              )}
            </div>

            {/* GIANT GREEN NUMERIC DIGITAL PRICE */}
            <div className="flex flex-col items-end shrink-0 bg-gray-900/90 px-3 py-1 rounded-lg border border-emerald-500/30">
              <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">سعر السلعة</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.85)] tabular-nums">
                  {formatCurrency(lastScannedItem ? lastScannedItem.price : 0, '').trim()}
                </span>
                <span className="text-emerald-400 font-black text-xs sm:text-sm">{currency}</span>
              </div>
            </div>
          </div>

          {/* Right: Total to Pay in Big Digital Green */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-black/85 border border-gray-800 rounded-xl px-3.5 py-2 w-full md:w-auto shrink-0 shadow-inner">
            <div>
              <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">
                المجموع ({cart.length} سلع)
              </span>
              <span className="text-[11px] text-gray-400 font-bold">الإجمالي للدفع</span>
            </div>
            <div className="flex items-baseline gap-1 bg-gray-900/90 px-3 py-1 rounded-lg border border-emerald-500/30">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.85)] tabular-nums">
                {formatCurrency(totalAmount, '').trim()}
              </span>
              <span className="text-emerald-400 font-black text-xs sm:text-sm">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* LEFT AREA: Product Catalog & Scale Quick Pick (Takes 65% width on desktop) */}
        <div className="flex-1 flex flex-col border-l border-gray-200 bg-[#F1F3F6] min-w-0">
          {/* Search Bar & Barcode Input */}
          <div className="p-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="امسح الباركود أو ابحث بالاسم / الصنف... (اضغط Enter للإضافة)"
                className="w-full bg-gray-50 text-gray-800 placeholder:text-gray-400 pr-10 pl-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
              />
              <Barcode className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </form>

            {/* Scale Quick Simulator Icon Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <Scale className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>نظام الميزان متصل</span>
            </div>
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('الكل')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'الكل'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stockQuantity <= 0;
              const isLow = product.stockQuantity <= product.minStockAlert && !isOutOfStock;
              const productImg = product.image || getSmartProductImage(product.name, product.category);

              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (product.isScaleItem) {
                      openScaleModal(product);
                    } else {
                      addPackagedProduct(product);
                    }
                  }}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border text-right transition-all duration-150 active:scale-[0.98] group relative bg-white shadow-xs ${
                    product.isScaleItem
                      ? 'border-emerald-200 hover:border-emerald-500 hover:shadow-md'
                      : 'border-gray-200 hover:border-blue-500 hover:shadow-md'
                  } ${isOutOfStock ? 'opacity-60 border-red-200 bg-gray-50' : ''}`}
                >
                  {/* Product Image & Badges Container */}
                  <div className="relative w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 mb-2 shrink-0">
                    <img
                      src={productImg}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = generateOfflineProductSvg(product.name, product.category);
                      }}
                    />

                    {/* Header tags: Weight item tag or stock badge overlay */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      {product.isScaleItem ? (
                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white shadow-xs backdrop-blur-xs">
                          <Scale className="w-3 h-3" />
                          <span>بالميزان</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                          {product.barcode.slice(-4)}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs ${
                          isOutOfStock
                            ? 'bg-red-600 text-white'
                            : isLow
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/90 text-gray-800 border border-gray-200/80'
                        }`}
                      >
                        {product.stockQuantity} {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Product Name */}
                  <h4 className="text-xs font-bold text-gray-800 line-clamp-2 mb-1.5 group-hover:text-blue-600 min-h-[32px] leading-tight">
                    {product.name}
                  </h4>

                  {/* Price & Unit with Green Numeric Display */}
                  <div className="flex items-baseline justify-between w-full pt-1.5 border-t border-gray-100 mt-auto">
                    <span className="text-[11px] text-gray-400 font-medium">
                      {product.isScaleItem ? 'للكيلو' : product.unit === 'piece' ? 'للقطعة' : product.unit}
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {formatCurrency(product.sellingPrice, currency)}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Package className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-semibold">لم يتم العثور على أي منتج يطابق البحث</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('الكل');
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  إعادة ضبط البحث
                </button>
              </div>
            )}
          </div>
        </div>

      {/* RIGHT AREA: Cart, Customer Selector & Financial Checkout (Takes 35% width on desktop) */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-full shrink-0 border-t lg:border-t-0 lg:border-r border-gray-200 shadow-sm">
        {/* Customer Selector Header */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">حساب الزبون:</span>
            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ زبون جديد</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 bg-white border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">زبون عابر (نقدي فوري)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.totalDebt > 0 ? `(عليه دين: ${c.totalDebt} ${currency})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && selectedCustomer.totalDebt > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex justify-between items-center">
              <span>الديون السابقة المسجلة عليه:</span>
              <span>{formatCurrency(selectedCustomer.totalDebt, currency)}</span>
            </div>
          )}
        </div>

        {/* Parked Carts Bar (If any) */}
        {heldCarts.length > 0 && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-amber-700 shrink-0">سلات معلقة:</span>
            {heldCarts.map((h) => (
              <button
                key={h.id}
                onClick={() => resumeHeldCart(h)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-gray-800 border border-amber-300 text-[11px] font-bold shrink-0 shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {h.name} ({h.items.length})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2 text-xs hover:border-blue-200 transition-colors"
            >
              {/* Product title & unit price */}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 truncate">{item.productName}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                  <span>@{formatCurrency(item.unitPrice, currency)}</span>
                  {item.isScaleItem && (
                    <span className="text-emerald-600 font-mono font-bold">
                      ({formatWeight(item.quantity, 'kg')})
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity controls or weight adjust */}
              <div className="flex items-center gap-1 shrink-0">
                {item.isScaleItem ? (
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs font-mono font-bold text-gray-800">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      value={item.quantity}
                      onChange={(e) => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                      className="w-14 bg-transparent text-center focus:outline-none text-blue-600 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">كغ</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                    <button
                      onClick={() => updateItemQty(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQty(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Item Total */}
                <span className="w-16 text-left font-bold text-gray-900 text-xs truncate">
                  {formatCurrency(item.total, currency)}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 stroke-[1.5]" />
              <p className="text-xs font-semibold text-gray-500">السلة فارغة حالياً</p>
              <p className="text-[11px] text-gray-400">اختر المنتجات أو امسح الباركود للبدء</p>
            </div>
          )}
        </div>

        {/* Cart Bottom Summary & Actions */}
        <div className="p-3 bg-white border-t border-gray-200 space-y-3 shadow-sm">
          {/* Quick Line: Subtotal & Discount Input */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>المجموع الفرعي:</span>
              <span className="font-bold text-gray-800">{formatCurrency(subtotal, currency)}</span>
            </div>

            <div className="flex items-center justify-between text-gray-500">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                <span>خصم على الفاتورة:</span>
              </span>
              <div className="flex items-center gap-1">
                {currentUser && currentUser.role !== 'admin' && !currentUser.permissions?.canApplyDiscount ? (
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1" title="صلاحية تطبيق الخصم مقفلة">
                    <span>🔒</span>
                    <span>محجوب</span>
                  </span>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      value={cartDiscount === 0 ? '' : cartDiscount}
                      onChange={(e) => setCartDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))}
                      placeholder="0"
                      className="w-16 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg px-2 py-1 text-center font-bold focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-[10px] text-gray-400">{currency}</span>
                  </>
                )}
              </div>
            </div>

            {/* Big Total */}
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
              <span className="text-sm font-extrabold text-gray-800">الإجمالي للدفع:</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 tracking-tight drop-shadow-xs">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
          </div>

          {/* Action Buttons: Hold, Clear, Checkout */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-600 border border-gray-200 transition-colors"
              title="تعليق السلة لخدمة زبون آخر"
            >
              <PauseCircle className="w-5 h-5" />
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="p-2.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-40 border border-gray-200 transition-colors"
              title="مسح السلة"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={openCheckout}
              disabled={cart.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-extrabold text-sm shadow-sm transition-all active:scale-[0.98]"
              title="اضغط Enter مرتين لإتمام الفاتورة فوراً"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>إتمام البيع والدفع (Enter ↵)</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SCALE WEIGHT MODAL (البيع بالميزان السريع) */}
      {/* ========================================================================= */}
      {scaleProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{scaleProduct.name}</h3>
                  <p className="text-[11px] text-blue-600 font-semibold">
                    سعر الكيلوغرام: {formatCurrency(scaleProduct.sellingPrice, currency)} / كغ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScaleProduct(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scale Calculation Display */}
            <div className="p-5 space-y-4">
              {/* Quick Preset Weight Buttons (250g, 500g, 750g, 1kg, 1.5kg, 2kg, 2.5kg, 5kg) */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">
                  أوزان شائعة سريعة (نقرة واحدة):
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { label: '250 غ (ربع)', grams: 250 },
                    { label: '500 غ (نصف)', grams: 500 },
                    { label: '750 غ', grams: 750 },
                    { label: '1 كغ', grams: 1000 },
                    { label: '1.25 كغ', grams: 1250 },
                    { label: '1.5 كغ', grams: 1500 },
                    { label: '2 كغ', grams: 2000 },
                    { label: '2.5 كغ', grams: 2500 },
                  ].map((preset) => (
                    <button
                      key={preset.grams}
                      type="button"
                      onClick={() => {
                        setScaleWeight(preset.grams);
                        setScaleUnit('g');
                      }}
                      className={`py-2 px-2 rounded-lg border text-center transition-colors ${
                        scaleUnit === 'g' && scaleWeight === preset.grams
                          ? 'bg-blue-600 border-blue-600 text-white font-extrabold shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Weight Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">أو أدخل الوزن يدوياً بدقة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={scaleUnit === 'g' ? '50' : '0.05'}
                    min="1"
                    value={scaleWeight}
                    onChange={(e) => setScaleWeight(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-white border border-gray-200 text-gray-900 text-lg font-mono font-bold rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        if (scaleUnit === 'kg') {
                          setScaleWeight(Math.round(scaleWeight * 1000));
                          setScaleUnit('g');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        scaleUnit === 'g' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      غرام (g)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (scaleUnit === 'g') {
                          setScaleWeight(scaleWeight / 1000);
                          setScaleUnit('kg');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        scaleUnit === 'kg' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      كيلوغرام (kg)
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Math Summary Card */}
              {(() => {
                const weightInKg = scaleUnit === 'g' ? scaleWeight / 1000 : scaleWeight;
                const calcTotal = Math.round(scaleProduct.sellingPrice * weightInKg * 100) / 100;
                const calcCost = Math.round(scaleProduct.costPrice * weightInKg * 100) / 100;
                const calcProfit = Math.round((calcTotal - calcCost) * 100) / 100;

                return (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>الوزن المحسوب:</span>
                      <span className="font-bold text-gray-800">
                        {scaleUnit === 'g' ? `${scaleWeight} غرام` : `${scaleWeight} كغ`} (
                        {Number(weightInKg.toFixed(3))} كغ)
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>تكلفة الكمية المباعة:</span>
                      <span>{formatCurrency(calcCost, currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600 font-semibold">
                      <span>الربح الصافي المتوقع:</span>
                      <span>+{formatCurrency(calcProfit, currency)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-800">السعر الإجمالي للوزن:</span>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 drop-shadow-xs">
                        {formatCurrency(calcTotal, currency)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setScaleProduct(null)}
                className="px-4 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmScaleAdd}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الوزن إلى الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHECKOUT & PAYMENT MODAL (شاشة الدفع وطرق السداد) */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-800">إتمام عملية البيع والدفع</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Grand Total Highlight */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700">المبلغ الإجمالي المطلوب:</p>
                  <h2 className="text-2xl font-black text-blue-700 mt-0.5">
                    {formatCurrency(totalAmount, currency)}
                  </h2>
                </div>
                <div className="text-left text-xs text-gray-500">
                  <p>{cart.length} منتجات في السلة</p>
                  <p className="text-emerald-600 font-bold">ربح متوقع: +{formatCurrency(totalProfit, currency)}</p>
                </div>
              </div>

              {/* Payment Methods Selection Tabs */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">طريقة الدفع:</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'cash', label: 'نقداً فوري' },
                    { id: 'credit', label: 'دين كامل (كريدي)' },
                    { id: 'partial', label: 'دفع جزئي + دين' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm.id as PaymentMethod);
                        if (pm.id === 'cash') setPaidAmount(totalAmount);
                        if (pm.id === 'credit') setPaidAmount(0);
                        if (pm.id === 'partial' && paidAmount === 0) setPaidAmount(Math.round(totalAmount / 2));
                      }}
                      className={`py-2.5 px-2 rounded-lg border text-center transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-blue-600 border-blue-600 text-white font-extrabold shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid Amount Input (For Cash & Partial) */}
              {paymentMethod !== 'credit' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">المبلغ المستلم من الزبون:</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-200 text-gray-900 text-xl font-mono font-bold rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
                  />

                  {/* Quick Preset Cash Chips (+500, +1000, +2000, +5000, بالضبط) */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(totalAmount)}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200"
                    >
                      المبلغ بالضبط
                    </button>
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPaidAmount(amt)}
                        className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold"
                      >
                        {amt} {currency}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Change / Debt Math Card */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                {paymentMethod === 'cash' && paidAmount > totalAmount && (
                  <div className="flex justify-between items-center text-sm font-extrabold text-amber-700">
                    <span>الباقي الواجب إرجاعه للزبون:</span>
                    <span className="text-base font-mono">{formatCurrency(paidAmount - totalAmount, currency)}</span>
                  </div>
                )}

                {(paymentMethod === 'credit' || paymentMethod === 'partial') && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-red-600 font-extrabold">
                      <span>المبلغ الذي سيسجل كدين على الزبون:</span>
                      <span className="text-base font-mono">
                        {formatCurrency(paymentMethod === 'credit' ? totalAmount : Math.max(0, totalAmount - paidAmount), currency)}
                      </span>
                    </div>
                    {!selectedCustomerId && (
                      <p className="text-[11px] text-red-600 font-medium">
                        ⚠️ تنبيه: يجب اختيار الزبون من القائمة لتسجيل الدين باسمه
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ملاحظات على الفاتورة (اختياري):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: وعد بالتسديد نهاية الشهر..."
                  className="w-full bg-white border border-gray-200 text-gray-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold"
              >
                رجوع
              </button>

              <button
                type="button"
                onClick={handleCompleteSale}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وطباعة الفاتورة (Enter ↵)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NEW CUSTOMER QUICK MODAL */}
      {/* ========================================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white border border-gray-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">إضافة زبون جديد سريع</h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 mb-1 block">اسم الزبون *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="مثال: يوسف حساني"
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 mb-1 block">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="0550 00 00 00"
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-500 mb-1 block">العنوان (اختياري)</label>
                <input
                  type="text"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="الحي، رقم الشارع..."
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                حفظ واختيار الزبون
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RECEIPT PRINT MODAL */}
      {/* ========================================================================= */}
      <ReceiptModal
        sale={completedSale}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
