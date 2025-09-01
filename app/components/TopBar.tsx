
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

interface TopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function TopBar({ sidebarOpen, setSidebarOpen }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const { user, signOut } = useAuth();

  const handleCalendarDownload = () => {
    // Télécharger le fichier .ics
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Prisme Studio//sndⴰrush//FR
BEGIN:VEVENT
UID:sample@prisme-studio.com
DTSTART:20250115T140000Z
DTEND:20250115T180000Z
SUMMARY:Réservation Pack Premium
DESCRIPTION:Événement client - Pack Premium
LOCATION:Paris, France
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservations-prisme-studio.ics';
    a.click();
    URL.revokeObjectURL(url);
    setShowCalendarSync(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
          >
            <i className={`${sidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-lg text-gray-600`}></i>
          </button>
          
          <div className="text-xl font-inter text-gray-900">
            Prisme Studio
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:inline">
            Back-Office
          </span>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Rechercher (réf, nom, tél...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 lg:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400 text-sm"></i>
            </div>
          </div>
          
          {/* Bouton de recherche mobile */}
          <button className="p-2 rounded-lg hover:bg-gray-100 md:hidden cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-search-line text-lg text-gray-600"></i>
            </div>
          </button>

          {/* Bouton Calendrier */}
          <div className="relative">
            <button
              onClick={() => setShowCalendarSync(!showCalendarSync)}
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
              title="Synchronisation automatique activée"
            >
              <div className="flex items-center">
                <div className="w-4 h-4 flex items-center justify-center mr-1 lg:mr-2 relative">
                  <i className="ri-calendar-line"></i>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <span className="hidden sm:inline">Sync Auto</span>
              </div>
            </button>

            {showCalendarSync && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Synchronisation automatique</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Actif</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <i className="ri-google-fill text-red-500"></i>
                        <span className="text-sm font-medium">Google Calendar</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connecté</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2">
                        <i className="ri-microsoft-fill text-blue-500"></i>
                        <span className="text-sm font-medium">Outlook</span>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Connecté</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <i className="ri-smartphone-line text-gray-600"></i>
                        <span className="text-sm font-medium">Apple Calendar</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Déconnecté</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Dernière sync:</span>
                      <span className="font-medium text-gray-900">Il y a 2 min</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Événements synchronisés:</span>
                      <span className="font-medium text-green-600">12 réservations</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Prochaine sync:</span>
                      <span className="font-medium text-blue-600">Dans 28 sec</span>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <Link
                      href="/calendar-sync"
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-center"
                      onClick={() => setShowCalendarSync(false)}
                    >
                      <i className="ri-settings-3-line mr-2"></i>
                      Gérer la synchronisation
                    </Link>
                    
                    <button
                      onClick={() => {
                        // Forcer une synchronisation manuelle
                        alert('🔄 Synchronisation forcée ! Vos calendriers sont à jour.');
                        setShowCalendarSync(false);
                      }}
                      className="w-full bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-center"
                    >
                      <i className="ri-refresh-line mr-2"></i>
                      Synchroniser maintenant
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Link
            href="/reservations/new"
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 lg:px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-sm"
          >
            <div className="flex items-center">
              <div className="w-4 h-4 flex items-center justify-center mr-1 lg:mr-2">
                <i className="ri-add-line"></i>
              </div>
              <span className="hidden sm:inline">Nouvelle réservation</span>
              <span className="sm:hidden">Nouveau</span>
            </div>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-2 py-1 cursor-pointer"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <i className="ri-user-line text-sm text-white"></i>
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-sm text-gray-700 font-medium">Admin</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <div className="w-4 h-4 flex items-center justify-center hidden lg:block">
                <i className="ri-arrow-down-s-line text-gray-400"></i>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 lg:hidden">
                    <div className="font-medium">Admin</div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center">
                      <div className="w-4 h-4 flex items-center justify-center mr-2">
                        <i className="ri-logout-box-line"></i>
                      </div>
                      Se déconnecter
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay pour fermer les menus sur mobile */}
      {(showUserMenu || showCalendarSync) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowCalendarSync(false);
          }}
        />
      )}
    </div>
  );
}
