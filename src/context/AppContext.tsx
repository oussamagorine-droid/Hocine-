import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, seedDatabaseIfEmpty } from '../db/db';
import { AppUser, HeldCart, StoreSettings } from '../types';
import { defaultSettings, initialUsers, DEFAULT_ROLE_PERMISSIONS } from '../db/seedData';

export type NavigationTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'purchases'
  | 'scale'
  | 'debts'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'profit_loss'
  | 'stagnant_expiry'
  | 'invoices'
  | 'reports'
  | 'users'
  | 'settings';

interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  category: 'low_stock' | 'expired' | 'near_expiry' | 'customer_debt' | 'stagnant';
  count: number;
}

interface AppContextType {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  usersList: AppUser[];
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  alerts: AlertItem[];
  refreshTrigger: number;
  triggerRefresh: () => void;
  heldCarts: HeldCart[];
  saveHeldCart: (cart: HeldCart) => void;
  removeHeldCart: (cartId: string) => void;
  playBeep: () => void;
  playSuccessSound: () => void;
  isLoading: boolean;
  isDbReady: boolean;
  selectedAlertCategory: string | null;
  setSelectedAlertCategory: (cat: string | null) => void;
  isAlertsModalOpen: boolean;
  setIsAlertsModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(initialUsers[0]);
  const [usersList, setUsersList] = useState<AppUser[]>(initialUsers);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<NavigationTab>('pos');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);
  const [selectedAlertCategory, setSelectedAlertCategory] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Web Audio synth for instant barcode beep & transaction sound (no external file needed!)
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked by browser policy until gesture
    }
  }, []);

  const playSuccessSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignored
    }
  }, []);

  // Initialize DB and load data
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        // Run seed with 2.5-second fallback timeout so the UI never hangs
        await Promise.race([
          seedDatabaseIfEmpty(),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
        
        // Load Settings
        try {
          const dbSettings = await db.settings.toCollection().first();
          if (dbSettings && isMounted) {
            setSettings(dbSettings);
            if (dbSettings.requirePinOnStartup) {
              setIsLocked(true);
            }
            if (dbSettings.startupTab) {
              setActiveTab(dbSettings.startupTab);
            } else {
              setActiveTab('pos');
            }
          }
        } catch (e) {
          console.warn('Load settings error:', e);
        }

        // Load Users
        try {
          const dbUsers = await db.users.toArray();
          if (dbUsers && dbUsers.length > 0 && isMounted) {
            const normalizedUsers = dbUsers.map((u) => {
              const baseRole = u.role || 'cashier';
              return {
                ...u,
                permissions: {
                  ...DEFAULT_ROLE_PERMISSIONS[baseRole],
                  ...(u.permissions || {}),
                },
              };
            });

            setUsersList(normalizedUsers);
            const savedUserIdStr = localStorage.getItem('grocery_pos_current_user_id');
            const savedUserId = savedUserIdStr ? Number(savedUserIdStr) : null;
            const savedUser = savedUserId ? normalizedUsers.find((u) => u.id === savedUserId && u.isActive) : null;
            const admin = normalizedUsers.find((u) => u.role === 'admin' && u.isActive) || normalizedUsers.find((u) => u.isActive) || normalizedUsers[0];
            const activeUser = savedUser || admin;
            setCurrentUser(activeUser);
            if (activeUser?.id) {
              localStorage.setItem('grocery_pos_current_user_id', String(activeUser.id));
            }
          }
        } catch (e) {
          console.warn('Load users error:', e);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsDbReady(true);
        }
      }
    }
    init();

    // Extra safety guarantee: if after 3 seconds isDbReady is still false, force it to true!
    const forceReadyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        setIsDbReady(true);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(forceReadyTimer);
    };
  }, []);

  // Reload users list when refreshTrigger fires
  useEffect(() => {
    let isMounted = true;
    async function syncUsers() {
      if (!isDbReady) return;
      try {
        const dbUsers = await db.users.toArray();
        if (dbUsers && dbUsers.length > 0 && isMounted) {
          setUsersList(dbUsers);
          // Keep current user object in sync with latest DB edits (role, permissions, name)
          setCurrentUser((prev) => {
            if (!prev) return dbUsers[0];
            const updated = dbUsers.find((u) => u.id === prev.id);
            if (updated) {
              return updated;
            }
            return dbUsers.find((u) => u.isActive) || dbUsers[0];
          });
        }
      } catch (err) {
        console.warn('Error syncing users:', err);
      }
    }
    syncUsers();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, isDbReady]);

  const handleSetCurrentUser = useCallback((user: AppUser | null) => {
    setCurrentUser(user);
    if (user?.id) {
      localStorage.setItem('grocery_pos_current_user_id', String(user.id));
    }
  }, []);

  // Compute Alerts whenever refreshTrigger changes
  useEffect(() => {
    async function calculateAlerts() {
      try {
        const products = await db.products.toArray();
        const customers = await db.customers.toArray();
        const sales = await db.sales.toArray();
        const now = new Date();
        const alertList: AlertItem[] = [];

        // 1. Low stock products
        const lowStock = products.filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0);
        if (lowStock.length > 0) {
          alertList.push({
            id: 'low-stock',
            type: 'warning',
            title: 'منتجات منخفضة المخزون',
            message: `يوجد ${lowStock.length} منتج وصل أو قارب الحد الأدنى للمخزون بحاجة لإعادة الشراء`,
            category: 'low_stock',
            count: lowStock.length,
          });
        }

        // 2. Out of stock products
        const outOfStock = products.filter((p) => p.stockQuantity <= 0);
        if (outOfStock.length > 0) {
          alertList.push({
            id: 'out-of-stock',
            type: 'danger',
            title: 'منتجات نفدت من المخزون',
            message: `يوجد ${outOfStock.length} منتج نفد تماماً (الكمية 0)`,
            category: 'low_stock',
            count: outOfStock.length,
          });
        }

        // 3. Expired & Near Expiry products
        const alertDays = settings.expiryAlertDays || 15;
        const expired = products.filter((p) => {
          if (!p.expiryDate) return false;
          const exp = new Date(p.expiryDate);
          return exp < now;
        });

        const nearExpiry = products.filter((p) => {
          if (!p.expiryDate) return false;
          const exp = new Date(p.expiryDate);
          const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= alertDays;
        });

        if (expired.length > 0) {
          alertList.push({
            id: 'expired-products',
            type: 'danger',
            title: 'منتجات منتهية الصلاحية',
            message: `يوجد ${expired.length} منتج انتهت صلاحيته ويجب سحبه من الرفوف فوراً`,
            category: 'expired',
            count: expired.length,
          });
        }

        if (nearExpiry.length > 0) {
          alertList.push({
            id: 'near-expiry',
            type: 'warning',
            title: 'منتجات قريبة من انتهاء الصلاحية',
            message: `يوجد ${nearExpiry.length} منتج ستنتهي صلاحيته خلال ${alertDays} يوماً`,
            category: 'near_expiry',
            count: nearExpiry.length,
          });
        }

        // 4. Overdue customer debts
        const inDebt = customers.filter((c) => c.totalDebt > 0);
        if (inDebt.length > 0) {
          const totalDebtAmt = inDebt.reduce((sum, c) => sum + c.totalDebt, 0);
          alertList.push({
            id: 'customer-debts',
            type: 'info',
            title: 'ديون الزبائن المستحقة',
            message: `يوجد ${inDebt.length} زبون عليهم ديون غير مسددة بإجمالي ${totalDebtAmt.toLocaleString()} ${settings.storeCurrency}`,
            category: 'customer_debt',
            count: inDebt.length,
          });
        }

        // 5. Stagnant products (no sales for 30+ days)
        const stagnantThresholdDays = settings.stagnantDaysThreshold || 30;
        const lastSaleDateByProduct = new Map<number, string>();
        for (const sale of sales) {
          for (const item of sale.items) {
            const current = lastSaleDateByProduct.get(item.productId);
            if (!current || sale.date > current) {
              lastSaleDateByProduct.set(item.productId, sale.date);
            }
          }
        }

        const stagnantList = products.filter((p) => {
          if (p.stockQuantity <= 0) return false;
          const lastSale = lastSaleDateByProduct.get(p.id!);
          if (!lastSale) {
            // Check created date
            const createdDays = (now.getTime() - new Date(p.createdAt || Date.now()).getTime()) / (1000 * 3600 * 24);
            return createdDays >= stagnantThresholdDays;
          }
          const daysSinceSale = (now.getTime() - new Date(lastSale).getTime()) / (1000 * 3600 * 24);
          return daysSinceSale >= stagnantThresholdDays;
        });

        if (stagnantList.length > 0) {
          alertList.push({
            id: 'stagnant-stock',
            type: 'info',
            title: 'منتجات راكدة في المخزن',
            message: `يوجد ${stagnantList.length} منتج لم يباع منذ أكثر من ${stagnantThresholdDays} يوماً وتجمد السيولة`,
            category: 'stagnant',
            count: stagnantList.length,
          });
        }

        setAlerts(alertList);
      } catch (err) {
        console.error('Error calculating alerts:', err);
      }
    }

    calculateAlerts();
  }, [refreshTrigger, settings]);

  // Auto-lock on inactivity if enabled
  useEffect(() => {
    if (!settings.autoLockMinutes || settings.autoLockMinutes <= 0 || isLocked) return;

    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsLocked(true);
      }, settings.autoLockMinutes! * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [settings.autoLockMinutes, isLocked]);

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    if (settings.id) {
      await db.settings.update(settings.id, updated);
    } else {
      const id = await db.settings.add(updated as StoreSettings);
      updated.id = id;
    }
    setSettings(updated);
    triggerRefresh();
  };

  const saveHeldCart = (cart: HeldCart) => {
    setHeldCarts((prev) => [...prev.filter((c) => c.id !== cart.id), cart]);
  };

  const removeHeldCart = (cartId: string) => {
    setHeldCarts((prev) => prev.filter((c) => c.id !== cartId));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        usersList,
        settings,
        updateSettings,
        activeTab,
        setActiveTab,
        isLocked,
        setIsLocked,
        alerts,
        refreshTrigger,
        triggerRefresh,
        heldCarts,
        saveHeldCart,
        removeHeldCart,
        playBeep,
        playSuccessSound,
        isLoading,
        isDbReady,
        selectedAlertCategory,
        setSelectedAlertCategory,
        isAlertsModalOpen,
        setIsAlertsModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
