import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStudentNumber('');
      setPassword('');
      setErrorText('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    onClose();
    navigate('/home');
  }, [isAuthenticated, isOpen, navigate, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedStudentNumber = studentNumber.trim();
    const normalizedPassword = password.trim();
    if (!normalizedStudentNumber || !normalizedPassword) {
      setErrorText('請輸入帳號與密碼');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    try {
      await login(normalizedStudentNumber, normalizedPassword);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '登入失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#2A241C]/45"
        aria-label="關閉登入視窗"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-[#D9C8A9] bg-[#FFF8E8] p-8 shadow-[0_24px_80px_rgba(42,36,28,0.18)]">
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold tracking-[0.16em] text-[#A56C3C]">登入學習帳號</p>
          <h2 className="text-3xl font-bold text-[#2E251A]">先登入，再開始練習</h2>
          <p className="mt-3 text-sm leading-6 text-[#6F6255]">
            預設帳號與密碼皆為學號，例如：`61105`。
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#4B3D31]">帳號</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className="w-full rounded-2xl border border-[#D8C6A9] bg-white px-4 py-3 text-[#2E251A] outline-none transition focus:border-[#D18D52] focus:ring-4 focus:ring-[#F0D3AE]"
              placeholder="請輸入學號"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#4B3D31]">密碼</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#D8C6A9] bg-white px-4 py-3 text-[#2E251A] outline-none transition focus:border-[#D18D52] focus:ring-4 focus:ring-[#F0D3AE]"
              placeholder="預設為學號"
            />
          </label>
          {errorText ? (
            <p className="rounded-2xl bg-[#FFF0E8] px-4 py-3 text-sm font-medium text-[#C75424]">{errorText}</p>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#D8C6A9] px-4 py-3 font-semibold text-[#5C4B3A] transition hover:bg-[#F4E7CC]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-[#D18D52] px-4 py-3 font-semibold text-[#2B2117] shadow-[0_6px_0_0_#A66B38] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_3px_0_0_#A66B38] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '登入中...' : '登入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
