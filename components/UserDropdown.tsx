'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  Home,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import useContextStore from '@/hooks/useContextStore';


const UserDropdown = () => {
  const { setIsLoggedIn, setSelectedFile, user } = useContextStore();
  const router= useRouter();
  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
    localStorage.removeItem('AccessToken');
    localStorage.removeItem('User');
    setIsLoggedIn(false);
    setSelectedFile(null);
    router.replace('/'); 
  };
  const noImage = 'https://i.pravatar.cc/40?img=5';
  return (
    <div className="relative group">
      {/* Focusable dropdown trigger */}
      <div
        tabIndex={0}
        className="relative cursor-pointer focus:outline-none"
      >
        <Image
          src={user?.picture || noImage}
          alt="User"
          className="w-8 h-8 rounded-full border border-gray-300"
          width={40}
          height={40}
        />
        <ChevronDown className="w-3 h-3 text-gray-500 bg-white rounded-full absolute top-[12px] -left-[10px]" />
      </div>

      {/* Dropdown menu (shown on focus-within) */}
      <div className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition duration-200 z-50">
        {/* User Info */}
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

        {/* Navigation Links */}
        <Link
          href="/dashboard"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Home className="w-4 h-4 mr-2 text-gray-500" />
          Dashboard
        </Link>
        <Link
          href="/profile"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
          Profile
        </Link>
        <Link
          href="/settings"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Settings className="w-4 h-4 mr-2 text-gray-500" />
          Settings
        </Link>

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
