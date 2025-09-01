
'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Gestion responsive de la sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Initialiser selon la taille d'écran
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          <div className="pt-16 min-h-screen w-full">
            {/* Overlay pour mobile */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
