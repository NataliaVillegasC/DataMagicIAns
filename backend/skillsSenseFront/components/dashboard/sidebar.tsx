"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileCheck, 
  Settings,
  LogOut 
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Candidates', href: '/dashboard/candidates', icon: Users },
  { name: 'Vacancies', href: '/dashboard/vacancies', icon: Briefcase },
  { name: 'Applications', href: '/dashboard/applications', icon: FileCheck },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <svg
            fill="currentColor"
            viewBox="0 0 147 70"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#e78a53] h-8 w-8"
          >
            <path d="M56 50.2031V14H70V60.1562C70 65.5928 65.5928 70 60.1562 70C57.5605 70 54.9982 68.9992 53.1562 67.1573L0 14H19.7969L56 50.2031Z"></path>
            <path d="M147 56H133V23.9531L100.953 56H133V70H96.6875C85.8144 70 77 61.1856 77 50.3125V14H91V46.1562L123.156 14H91V0H127.312C138.186 0 147 8.81439 147 19.6875V56Z"></path>
          </svg>
          <span className="text-xl font-bold text-white">SkillSense</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-[#e78a53] text-white' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-zinc-800">
        <div className="mb-3 px-4">
          <p className="text-sm font-medium text-white truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
          <p className="text-xs text-zinc-500 truncate mt-1">
            {user?.company?.name}
          </p>
        </div>
        
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

