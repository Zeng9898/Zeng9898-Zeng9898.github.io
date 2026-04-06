import { Link, useNavigate } from 'react-router-dom';
import logoImage from '../assets/logo.png';
import homeIcon from '../assets/home_icon.png';
import profileIcon from '../assets/profile_icon.png';
import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  { id: 'home', label: '首頁', active: true },
  { id: 'profile', label: '個人檔案', active: false },
] as const;

export default function SideNav() {
  const navigate = useNavigate();
  const { student, logout } = useAuth();

  return (
    <aside className="w-[260px] shrink-0 bg-[#F7EAD0] flex flex-col min-h-screen border-r-2 border-[#d4c9b8]">
      <Link to="/" className="p-12 flex justify-center">
        <img src={logoImage} alt="Argu as Scientists" className="h-20 w-auto object-contain" />
      </Link>
      <div className="mx-4 mb-3 rounded-2xl border border-[#d4c9b8] bg-[#FFF5DA] px-4 py-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#8C6B4A]">目前學生</p>
        <p className="mt-2 text-lg font-bold text-[#2E251A]">{student?.studentNumber ?? '未登入'}</p>
      </div>
      <nav className="p-3 flex flex-col gap-1 flex-1">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`flex items-center gap-2 px-8 py-3 my-1 rounded-lg text-left text-[16px] tracking-wide transition-colors border ${item.active
              ? 'bg-[#FFF5DA] text-[#FF774B] font-semibold border-[#FF774B] shadow-[0_2px_10px_rgba(255,74,42,0.2)]'
              : 'text-[#1a1612] hover:bg-[#FFF5DA] border-transparent'
              }`}
            onClick={() => navigate(item.id === 'home' ? '/home' : '/home')}
          >
            {item.id === 'home' ? (
              <img src={homeIcon} alt="" className="w-10 h-10 mx-1 object-contain shrink-0" aria-hidden />
            ) : item.id === 'profile' ? (
              <img src={profileIcon} alt="" className="w-10 h-10 mx-1 object-contain shrink-0" aria-hidden />
            ) : (
              <span className="w-2 h-2 rounded-full bg-current opacity-70" aria-hidden />
            )}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 pt-0">
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
          className="w-full rounded-2xl border border-[#C7B79E] px-4 py-3 text-sm font-semibold text-[#5C4B3A] transition hover:bg-[#FFF5DA]"
        >
          登出
        </button>
      </div>
    </aside>
  );
}
