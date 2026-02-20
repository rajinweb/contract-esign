'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useContextStore from '@/hooks/useContextStore';
import { useAuth } from '@/components/auth/AuthProvider';
import { ChevronDown, Home, User, Settings, LogOut } from 'lucide-react';

const UserDropdown = () => {
  const router = useRouter();
  const { setIsLoggedIn, setSelectedFile, user, setUser } = useContextStore();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setIsLoggedIn(false);
      setSelectedFile(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const navigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const noImage = 'https://i.pravatar.cc/40?img=5';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar and Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative cursor-pointer focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Image
          src={user?.picture || noImage}
          alt="User"
          className="w-8 h-8 rounded-full border border-gray-300"
          width={40}
          height={40}
        />
        <ChevronDown className="w-3 h-3 text-gray-500 bg-white rounded-full absolute top-[12px] -left-[10px]" />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg transition duration-200 z-50 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        role="menu"
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image
              src={user?.picture || noImage}
              alt="User"
              className="w-10 h-10 rounded-full"
              width={40}
              height={40}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">{user?.name || 'No Name'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
          role="menuitem"
        >
          <Home className="w-4 h-4 mr-2 text-gray-500" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard?view=profile')}
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
          role="menuitem"
        >
          <User className="w-4 h-4 mr-2 text-gray-500" />
          Profile
        </button> 
        <button
          type="button"
          onClick={() => navigate('/dashboard?view=settings')}
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
          role="menuitem"
        >
          <Settings className="w-4 h-4 mr-2 text-gray-500" />
          Settings
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="w-4 h-4 mr-2 text-gray-500" />
          logout
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;
