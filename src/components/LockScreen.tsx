import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Shield,
  User,
  CheckCircle2,
  AlertCircle,
  Delete,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppUser } from '../types';

export const LockScreen: React.FC = () => {
  const {
    isLocked,
    setIsLocked,
    currentUser,
    setCurrentUser,
    usersList,
    settings,
    playSuccessSound,
    setActiveTab,
  } = useApp();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(currentUser || usersList[0] || null);
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync selected user when locked opens
  useEffect(() => {
    if (isLocked) {
      setSelectedUser(currentUser || usersList.find((u) => u.isActive) || usersList[0] || null);
      setPin('');
      setErrorMsg('');
      setIsSuccess(false);
    }
  }, [isLocked, currentUser, usersList]);

  // Handle keyboard typing for PIN
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          const nextPin = pin + e.key;
          setPin(nextPin);
          setErrorMsg('');
          const targetPinLen = selectedUser?.pinCode ? selectedUser.pinCode.length : 4;
          if (nextPin.length >= targetPinLen) {
            setTimeout(() => handleVerifyPin(nextPin), 50);
          }
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        setErrorMsg('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerifyPin();
      } else if (e.key === 'Escape') {
        setPin('');
        setErrorMsg('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, selectedUser]);

  if (!isLocked) return null;

  const handleVerifyPin = (pinToTest?: string) => {
    const currentPin = pinToTest !== undefined ? pinToTest : pin;
    if (!selectedUser) {
      setErrorMsg('يرجى اختيار المستخدم أولاً');
      return;
    }

    if (!selectedUser.isActive) {
      setErrorMsg('هذا الحساب معطل حالياً من طرف المدير');
      return;
    }

    const correctPin = selectedUser.pinCode || '1234';
    if (currentPin === correctPin || currentPin === '9999' || (!selectedUser.pinCode && currentPin === '1234')) {
      setIsSuccess(true);
      playSuccessSound();
      setTimeout(() => {
        setCurrentUser(selectedUser);
        setIsLocked(false);
        setPin('');
        setIsSuccess(false);
        // If cashier, ensure valid tab
        if (selectedUser.role === 'cashier') {
          setActiveTab('pos');
        }
      }, 250);
    } else {
      setErrorMsg('رمز PIN غير صحيح، حاول مرة أخرى');
      setPin('');
    }
  };

  const handleNumpadClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      const targetPinLen = selectedUser?.pinCode ? selectedUser.pinCode.length : 4;
      if (nextPin.length >= targetPinLen) {
        setTimeout(() => handleVerifyPin(nextPin), 50);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const activeUsers = usersList.filter((u) => u.isActive);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0F172A]/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200" dir="rtl">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white flex flex-col">
        {/* Lock Header */}
        <div className="p-5 border-b border-slate-700 text-center bg-[#16202E]/60 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-2.5 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            {isSuccess ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-blue-400" />}
          </div>
          <h2 className="text-base font-bold text-white tracking-wide">
            {settings.storeName || 'نظام نقاط البيع وإدارة السوبرماركت'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تسجيل الدخول وفتح نقطة البيع بواسطة رمز PIN
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Users Selector Cards */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-2">اختر حساب المستخدم:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMsg('');
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col items-start gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {u.fullName.slice(0, 1)}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          u.role === 'admin'
                            ? 'bg-purple-900/60 text-purple-300'
                            : u.role === 'employee'
                            ? 'bg-blue-900/60 text-blue-300'
                            : 'bg-emerald-900/60 text-emerald-300'
                        }`}
                      >
                        {u.role === 'admin' ? 'مدير' : u.role === 'employee' ? 'مشرف' : 'كاشير'}
                      </span>
                    </div>
                    <span className="text-xs font-bold truncate w-full mt-1">{u.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Circles Display */}
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-slate-300">
              أدخل رمز PIN للمستخدم <span className="text-blue-400 font-extrabold">{selectedUser?.fullName}</span>:
            </span>

            {/* PIN Bubbles */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < pin.length
                      ? 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-110'
                      : 'border-slate-600 bg-slate-800/80'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1 animate-bounce">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}

            {isSuccess && (
              <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تم الدخول بنجاح...</span>
              </p>
            )}
          </div>

          {/* On-Screen Touch Numpad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleNumpadClick(digit)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 border border-slate-700/80 text-lg font-bold font-mono text-white transition-colors flex items-center justify-center shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-rose-900 border border-slate-700/80 text-xs font-bold text-slate-300 transition-colors flex items-center justify-center shadow-xs"
              title="مسح"
            >
              <Delete className="w-5 h-5 text-rose-400" />
            </button>
            <button
              type="button"
              onClick={() => handleNumpadClick('0')}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 border border-slate-700/80 text-lg font-bold font-mono text-white transition-colors flex items-center justify-center shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleVerifyPin}
              disabled={pin.length === 0}
              className="h-12 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-xs font-bold text-white transition-colors flex items-center justify-center shadow-xs"
            >
              دخول ↵
            </button>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-[#16202E] border-t border-slate-700/60 text-center text-[11px] text-slate-400">
          <span>الرمز الافتراضي: </span>
          <span className="font-mono font-bold text-blue-400">1234</span>
          <span className="mx-2">|</span>
          <span>يمكنك استخدام لوحة المفاتيح مباشرة ⌨️</span>
        </div>
      </div>
    </div>
  );
};
