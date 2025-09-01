
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: 'ri-dashboard-line' },
    { name: 'Réservations', href: '/reservations', icon: 'ri-calendar-line' },
    { name: 'Clients', href: '/clients', icon: 'ri-user-line' },
    { name: 'Packs', href: '/packs', icon: 'ri-shopping-bag-line' },
    { name: 'Livraisons', href: '/livraisons', icon: 'ri-truck-line' },
    { name: 'Paiements', href: '/paiements', icon: 'ri-money-euro-circle-line' },
    { name: 'Dépenses', href: '/depenses', icon: 'ri-money-dollar-circle-line' },
    { name: 'Archives', href: '/archives', icon: 'ri-archive-line' },
  ];

  return (
    <div className={`${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } w-64 bg-white border-r border-gray-200 flex flex-col fixed top-16 left-0 bottom-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0`}>
      {/* Logo */}
      <div className="flex items-center border-b border-gray-200 py-4 px-6">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
          <i className="ri-music-2-line text-white text-lg"></i>
        </div>
        <span className="text-xl font-bold text-gray-900">sndⴰrush</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                isActive(item.href)
                  ? 'bg-orange-100 text-orange-600 border-r-2 border-orange-600'
                  : 'text-gray-700 hover:bg-gray-100'
              } group flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer rounded-l-lg`}
            >
              <div className="w-4 h-4 flex items-center justify-center mr-3">
                <i className={`${item.icon} text-lg`}></i>
              </div>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Version */}
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Version 1.0.0</p>
      </div>
    </div>
  );
}
