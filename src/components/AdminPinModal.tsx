import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  initialMode?: 'verify' | 'change';
  currentPin: string;
  isAdminAuthenticated: boolean;
  targetFeatureLabel?: string;
  onClose: () => void;
  onSuccessVerify: () => void;
  onChangePin: (newPin: string) => void;
  onLogoutAdmin: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  initialMode = 'verify',
  currentPin,
  isAdminAuthenticated,
  targetFeatureLabel,
  onClose,
  onSuccessVerify,
  onChangePin,
  onLogoutAdmin,
}) => {
  const [mode, setMode] = useState<'verify' | 'change'>(initialMode);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change PIN fields
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPinInput('');
      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setErrorMsg(null);
      setSuccessMsg(null);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const sanitizeSixDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, 6);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (pinInput.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ mật khẩu gồm 6 chữ số (0–9).');
      return;
    }
    if (pinInput !== currentPin) {
      setErrorMsg('Mật khẩu quản trị 6 số không chính xác. Vui lòng kiểm tra lại.');
      setPinInput('');
      inputRef.current?.focus();
      return;
    }
    onSuccessVerify();
  };

  const handleKeypadDigit = (digit: string) => {
    setErrorMsg(null);
    if (digit === 'CLEAR') {
      setPinInput('');
      return;
    }
    if (digit === 'BACKSPACE') {
      setPinInput((prev) => prev.slice(0, -1));
      return;
    }
    setPinInput((prev) => {
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (oldPinInput !== currentPin) {
      setErrorMsg('Mật khẩu 6 số hiện tại không đúng.');
      return;
    }
    if (!/^\d{6}$/.test(newPinInput)) {
      setErrorMsg('Mật khẩu mới bắt buộc phải gồm đúng 6 chữ số (từ 0 đến 9).');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu 6 số mới.');
      return;
    }

    onChangePin(newPinInput);
    setOldPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setSuccessMsg('Đã cập nhật mật khẩu quản trị 6 số thành công!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-2.5 sm:p-4 no-print">
      <div className="bg-[#18182e] border-2 border-violet-600/80 rounded-2xl max-w-md w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header (Always visible, never clipped) */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/30 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                Bảo Mật Quản Trị Hệ Thống (PIN 6 Số)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {targetFeatureLabel
                  ? `Yêu cầu xác thực để mở: ${targetFeatureLabel}`
                  : 'Dành cho Quản trị mạng & Giáo viên quản lý'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs: Xác thực PIN vs. Đổi Mật Khẩu 6 Số */}
        <div className="grid grid-cols-2 gap-1.5 px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('verify');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'verify'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Nhập Mật Khẩu (6 Số)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('change');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'change'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Đổi Mật Khẩu 6 Số</span>
          </button>
        </div>

        {/* Modal Body (Scrollable if viewport is very short) */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/70 text-rose-200 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'verify' ? (
            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200">
                    Nhập mật khẩu quản trị gồm 6 chữ số:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 font-medium shrink-0"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? 'Ẩn số' : 'Hiện số'}</span>
                  </button>
                </div>

                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setPinInput(sanitizeSixDigits(e.target.value));
                  }}
                  placeholder="••••••"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border-2 border-violet-500/80 text-white font-mono text-xl font-extrabold tracking-[0.45em] text-center focus:outline-none focus:border-violet-400 tabular-nums"
                />
              </div>

              {/* Quick On-screen Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-sm font-bold">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleKeypadDigit(d)}
                    className="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadDigit('CLEAR')}
                  className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Xoá hết
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadDigit('0')}
                  className="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadDigit('BACKSPACE')}
                  className="py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white flex items-center justify-center transition-colors shadow-xs"
                  title="Lùi 1 số"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-snug">
                <strong className="text-violet-300">Phân quyền mặc định:</strong> Học sinh & khách được tự do vào <strong>Trang Chủ</strong>, <strong>Cổng Học Sinh (Phòng thi)</strong>, <strong>Trộn Đề & Xuất Đề</strong>, <strong>Đổi màu nền / Cỡ chữ</strong> và <strong>Giới Thiệu Tính Năng</strong>. Các chức năng Quản trị yêu cầu mật khẩu 6 số.
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {isAdminAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogoutAdmin();
                      onClose();
                    }}
                    className="mr-auto px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Khóa Quản Trị</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Mở Khóa Quản Trị</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  1. Mật khẩu 6 số hiện tại
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(sanitizeSixDigits(e.target.value))}
                  placeholder="Nhập 6 số hiện tại..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base font-bold tracking-widest focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  2. Mật khẩu 6 số mới (gồm 6 chữ số 0–9)
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(sanitizeSixDigits(e.target.value))}
                  placeholder="Nhập 6 chữ số mới..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base font-bold tracking-widest focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  3. Nhập lại mật khẩu 6 số mới
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(sanitizeSixDigits(e.target.value))}
                  placeholder="Xác nhận 6 chữ số mới..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base font-bold tracking-widest focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 font-medium"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('verify')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>Lưu Mật Khẩu 6 Số Mới</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
