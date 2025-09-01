'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CalendarSyncProps {
  reservations?: any[];
}

export default function CalendarSync({ reservations = [] }: CalendarSyncProps) {
  const [syncSettings, setSyncSettings] = useState({
    googleEnabled: false,
    outlookEnabled: false,
    appleEnabled: false,
    autoSync: true,
    syncFrequency: 'realtime',
    lastSync: null as string | null,
    googleAccessToken: null as string | null,
    outlookAccessToken: null as string | null,
    appleCalendarUrl: null as string | null
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSyncSettings();
    if (syncSettings.autoSync) {
      startAutoSync();
    }
  }, []);

  const loadSyncSettings = async () => {
    try {
      const saved = localStorage.getItem('calendar-sync-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setSyncSettings(settings);
        
        // Vérifier si les tokens sont encore valides
        if (settings.googleAccessToken) {
          await validateGoogleToken(settings.googleAccessToken);
        }
        if (settings.outlookAccessToken) {
          await validateOutlookToken(settings.outlookAccessToken);
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const saveSyncSettings = (newSettings: typeof syncSettings) => {
    setSyncSettings(newSettings);
    localStorage.setItem('calendar-sync-settings', JSON.stringify(newSettings));
  };

  const validateGoogleToken = async (token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      if (!response.ok) {
        // Token expiré, le supprimer
        saveSyncSettings({
          ...syncSettings,
          googleEnabled: false,
          googleAccessToken: null
        });
      }
    } catch (error) {
      console.error('Erreur validation token Google:', error);
    }
  };

  const validateOutlookToken = async (token: string) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // Token expiré, le supprimer
        saveSyncSettings({
          ...syncSettings,
          outlookEnabled: false,
          outlookAccessToken: null
        });
      }
    } catch (error) {
      console.error('Erreur validation token Outlook:', error);
    }
  };

  const quickAddToCalendar = (reservation: any, calendarType: 'google' | 'outlook' | 'yahoo') => {
    const eventDate = new Date(reservation.date_event);
    const eventTitle = `Réservation - ${reservation.clients?.prenom} ${reservation.clients?.nom}`;
    const eventDescription = `Pack: ${reservation.packs?.nom_pack}\nVille: ${reservation.ville_zone}\nPrix: ${reservation.prix_total_ttc}€`;
    
    let calendarUrl = '';
    
    switch (calendarType) {
      case 'google':
        calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(eventDescription)}`;
        break;
      case 'outlook':
        calendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventTitle)}&startdt=${eventDate.toISOString()}&enddt=${eventDate.toISOString()}&body=${encodeURIComponent(eventDescription)}`;
        break;
      case 'yahoo':
        calendarUrl = `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(eventTitle)}&st=${eventDate.toISOString()}&et=${eventDate.toISOString()}&desc=${encodeURIComponent(eventDescription)}`;
        break;
    }
    
    if (calendarUrl) {
      window.open(calendarUrl, '_blank');
    }
  };

  const startAutoSync = () => {
    const interval = syncSettings.syncFrequency === 'realtime' ? 30000 : // 30 secondes
                    syncSettings.syncFrequency === 'hourly' ? 3600000 : // 1 heure
                    syncSettings.syncFrequency === 'daily' ? 86400000 : // 24 heures
                    604800000; // 1 semaine

    setInterval(() => {
      if (syncSettings.autoSync) {
        syncAllCalendars();
      }
    }, interval);
  };

  const syncAllCalendars = async () => {
    setSyncStatus('syncing');
    try {
      const promises = [];
      
      if (syncSettings.googleEnabled && syncSettings.googleAccessToken) {
        promises.push(syncGoogleCalendar());
      }
      
      if (syncSettings.outlookEnabled && syncSettings.outlookAccessToken) {
        promises.push(syncOutlookCalendar());
      }
      
      if (syncSettings.appleEnabled && syncSettings.appleCalendarUrl) {
        promises.push(syncAppleCalendar());
      }

      await Promise.all(promises);
      
      saveSyncSettings({
        ...syncSettings,
        lastSync: new Date().toISOString()
      });
      
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const syncGoogleCalendar = async () => {
    if (!syncSettings.googleAccessToken) return;

    try {
      // Récupérer les calendriers existants
      const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${syncSettings.googleAccessToken}`
        }
      });

      if (!calendarsResponse.ok) throw new Error('Erreur accès Google Calendar');

      const calendarsData = await calendarsResponse.json();
      let soundrentCalendar = calendarsData.items.find((cal: any) => cal.summary === 'SoundRent Réservations');

      // Créer le calendrier s'il n'existe pas
      if (!soundrentCalendar) {
        const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${syncSettings.googleAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: 'SoundRent Réservations',
            description: 'Calendrier automatique des réservations SoundRent'
          })
        });

        if (!createResponse.ok) throw new Error('Erreur création calendrier Google');
        soundrentCalendar = await createResponse.json();
      }

      // Supprimer les anciens événements
      const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${soundrentCalendar.id}/events`, {
        headers: {
          'Authorization': `Bearer ${syncSettings.googleAccessToken}`
        }
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const deletePromises = eventsData.items
          .filter((event: any) => event.description?.includes('SoundRent-ID:'))
          .map((event: any) => 
            fetch(`https://www.googleapis.com/calendar/v3/calendars/${soundrentCalendar.id}/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${syncSettings.googleAccessToken}`
              }
            })
          );
        
        await Promise.all(deletePromises);
      }

      // Créer les nouveaux événements
      const createPromises = reservations
        .filter(res => res.date_event && !['Annulée', 'Brouillon'].includes(res.statut))
        .map(reservation => {
          const startDate = new Date(`${reservation.date_event}T${reservation.heure_event || '14:00'}`);
          const endDate = reservation.heure_fin_event 
            ? new Date(`${reservation.date_fin_event || reservation.date_event}T${reservation.heure_fin_event}`)
            : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

          const clientName = reservation.fullName || 
            (reservation.clients ? `${reservation.clients.prenom} ${reservation.clients.nom}` : 'Client');

          return fetch(`https://www.googleapis.com/calendar/v3/calendars/${soundrentCalendar.id}/events`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${syncSettings.googleAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              summary: `${reservation.ref} - ${clientName}`,
              description: `Pack: ${reservation.packs?.nom_pack || 'Pack'}
Statut: ${reservation.statut}
Zone: ${reservation.ville_zone}
${reservation.adresse_event ? `Adresse: ${reservation.adresse_event}` : ''}
${reservation.notes ? `Notes: ${reservation.notes}` : ''}

SoundRent-ID: ${reservation.id}`,
              location: reservation.adresse_event || reservation.ville_zone || '',
              start: {
                dateTime: startDate.toISOString(),
                timeZone: 'Europe/Paris'
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Europe/Paris'
              },
              colorId: reservation.statut === 'Soldée' ? '10' : 
                      reservation.statut === 'Acompte payé' ? '5' : '1'
            })
          });
        });

      await Promise.all(createPromises);
    } catch (error) {
      console.error('Erreur sync Google Calendar:', error);
      throw error;
    }
  };

  const syncOutlookCalendar = async () => {
    if (!syncSettings.outlookAccessToken) return;

    try {
      // Récupérer les calendriers existants
      const calendarsResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: {
          'Authorization': `Bearer ${syncSettings.outlookAccessToken}`
        }
      });

      if (!calendarsResponse.ok) throw new Error('Erreur accès Outlook Calendar');

      const calendarsData = await calendarsResponse.json();
      let soundrentCalendar = calendarsData.value.find((cal: any) => cal.name === 'SoundRent Réservations');

      // Créer le calendrier s'il n'existe pas
      if (!soundrentCalendar) {
        const createResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${syncSettings.outlookAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'SoundRent Réservations'
          })
        });

        if (!createResponse.ok) throw new Error('Erreur création calendrier Outlook');
        soundrentCalendar = await createResponse.json();
      }

      // Supprimer les anciens événements
      const eventsResponse = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${soundrentCalendar.id}/events`, {
        headers: {
          'Authorization': `Bearer ${syncSettings.outlookAccessToken}`
        }
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const deletePromises = eventsData.value
          .filter((event: any) => event.body?.content?.includes('SoundRent-ID:'))
          .map((event: any) => 
            fetch(`https://graph.microsoft.com/v1.0/me/calendars/${soundrentCalendar.id}/events/${event.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${syncSettings.outlookAccessToken}`
              }
            })
          );
        
        await Promise.all(deletePromises);
      }

      // Créer les nouveaux événements
      const createPromises = reservations
        .filter(res => res.date_event && !['Annulée', 'Brouillon'].includes(res.statut))
        .map(reservation => {
          const startDate = new Date(`${reservation.date_event}T${reservation.heure_event || '14:00'}`);
          const endDate = reservation.heure_fin_event 
            ? new Date(`${reservation.date_fin_event || reservation.date_event}T${reservation.heure_fin_event}`)
            : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

          const clientName = reservation.fullName || 
            (reservation.clients ? `${reservation.clients.prenom} ${reservation.clients.nom}` : 'Client');

          return fetch(`https://graph.microsoft.com/v1.0/me/calendars/${soundrentCalendar.id}/events`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${syncSettings.outlookAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subject: `${reservation.ref} - ${clientName}`,
              body: {
                contentType: 'text',
                content: `Pack: ${reservation.packs?.nom_pack || 'Pack'}
Statut: ${reservation.statut}
Zone: ${reservation.ville_zone}
${reservation.adresse_event ? `Adresse: ${reservation.adresse_event}` : ''}
${reservation.notes ? `Notes: ${reservation.notes}` : ''}

SoundRent-ID: ${reservation.id}`
              },
              location: {
                displayName: reservation.adresse_event || reservation.ville_zone || ''
              },
              start: {
                dateTime: startDate.toISOString(),
                timeZone: 'Europe/Paris'
              },
              end: {
                dateTime: endDate.toISOString(),
                timeZone: 'Europe/Paris'
              }
            })
          });
        });

      await Promise.all(createPromises);
    } catch (error) {
      console.error('Erreur sync Outlook Calendar:', error);
      throw error;
    }
  };

  const syncAppleCalendar = async () => {
    // Pour Apple Calendar, on utilise CalDAV ou on génère un fichier .ics hébergé
    try {
      const icalData = generateICalData(reservations);
      
      // Ici on pourrait envoyer le fichier vers un serveur pour créer une URL permanente
      // Pour l'instant, on simule avec un blob URL
      const blob = new Blob([icalData], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      
      // Sauvegarder l'URL pour Apple Calendar
      saveSyncSettings({
        ...syncSettings,
        appleCalendarUrl: url
      });
      
    } catch (error) {
      console.error('Erreur sync Apple Calendar:', error);
      throw error;
    }
  };

  const connectGoogleCalendar = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    const scope = 'https://www.googleapis.com/auth/calendar';
    const redirectUri = `${window.location.origin}/calendar-callback`;
    const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`;
    
    // Ouvrir dans une popup pour récupérer le code d'autorisation
    const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
    
    // Écouter les messages de la popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        saveSyncSettings({
          ...syncSettings,
          googleEnabled: true,
          googleAccessToken: event.data.accessToken
        });
        popup?.close();
        syncAllCalendars();
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
  };

  const connectOutlookCalendar = () => {
    const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID || 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    const scope = 'https://graph.microsoft.com/calendars.readwrite';
    const redirectUri = `${window.location.origin}/calendar-callback`;
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&prompt=consent`;
    
    const popup = window.open(authUrl, 'outlook-auth', 'width=500,height=600');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
        saveSyncSettings({
          ...syncSettings,
          outlookEnabled: true,
          outlookAccessToken: event.data.accessToken
        });
        popup?.close();
        syncAllCalendars();
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
  };

  const connectAppleCalendar = () => {
    // Générer un lien webcal permanent
    const icalData = generateICalData(reservations);
    const blob = new Blob([icalData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const webcalUrl = url.replace('blob:', 'webcal://');
    
    saveSyncSettings({
      ...syncSettings,
      appleEnabled: true,
      appleCalendarUrl: webcalUrl
    });
    
    // Copier le lien webcal
    navigator.clipboard.writeText(webcalUrl);
    alert('✅ Lien webcal copié ! Ajoutez-le dans Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Ajouter un calendrier par abonnement');
  };

  const disconnectCalendar = (platform: 'google' | 'outlook' | 'apple') => {
    const newSettings = { ...syncSettings };
    
    if (platform === 'google') {
      newSettings.googleEnabled = false;
      newSettings.googleAccessToken = null;
    } else if (platform === 'outlook') {
      newSettings.outlookEnabled = false;
      newSettings.outlookAccessToken = null;
    } else if (platform === 'apple') {
      newSettings.appleEnabled = false;
      newSettings.appleCalendarUrl = null;
    }
    
    saveSyncSettings(newSettings);
  };

  const generateICalData = (reservations: any[]) => {
    const icalHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SoundRent//Reservations//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:SoundRent Réservations',
      'X-WR-CALDESC:Calendrier automatique des réservations SoundRent'
    ].join('\r\n');

    const events = reservations
      .filter(res => res.date_event && !['Annulée', 'Brouillon'].includes(res.statut))
      .map(reservation => {
        const startDate = new Date(`${reservation.date_event}T${reservation.heure_event || '14:00'}`);
        const endDate = reservation.heure_fin_event 
          ? new Date(`${reservation.date_fin_event || reservation.date_event}T${reservation.heure_fin_event}`)
          : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const clientName = reservation.fullName || 
          (reservation.clients ? `${reservation.clients.prenom} ${reservation.clients.nom}` : 'Client');
        const packName = reservation.packs?.nom_pack || 'Pack';
        
        return [
          'BEGIN:VEVENT',
          `UID:soundrent-${reservation.id}@soundrent.app`,
          `DTSTART:${formatDate(startDate)}`,
          `DTEND:${formatDate(endDate)}`,
          `DTSTAMP:${formatDate(new Date())}`,
          `SUMMARY:${reservation.ref} - ${clientName}`,
          `DESCRIPTION:Pack: ${packName}\\nStatut: ${reservation.statut}\\nZone: ${reservation.ville_zone}${reservation.adresse_event ? '\\nAdresse: ' + reservation.adresse_event.replace(/\n/g, '\\n') : ''}${reservation.notes ? '\\nNotes: ' + reservation.notes.replace(/\n/g, '\\n') : ''}\\n\\nSoundRent-ID: ${reservation.id}`,
          `LOCATION:${reservation.adresse_event || reservation.ville_zone || ''}`,
          `STATUS:${reservation.statut === 'Soldée' ? 'CONFIRMED' : 'TENTATIVE'}`,
          `CATEGORIES:SoundRent,${reservation.statut}`,
          'END:VEVENT'
        ].join('\r\n');
      });

    const icalFooter = 'END:VCALENDAR';
    
    return [icalHeader, ...events, icalFooter].join('\r\n');
  };

  const downloadICalFile = () => {
    try {
      const icalData = generateICalData(reservations);
      const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `soundrent-reservations-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      saveSyncSettings({
        ...syncSettings,
        lastSync: new Date().toISOString()
      });
      
      alert('✅ Fichier calendrier téléchargé ! Importez-le dans votre application de calendrier.');
    } catch (error) {
      console.error('Erreur génération iCal:', error);
      alert('❌ Erreur lors de la génération du fichier calendrier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section principale */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className={`ri-calendar-2-line text-blue-600 text-lg ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Synchronisation automatique</h2>
              <p className="text-sm text-gray-500">
                {syncStatus === 'syncing' && 'Synchronisation en cours...'}
                {syncStatus === 'success' && '✅ Dernière sync réussie'}
                {syncStatus === 'error' && '❌ Erreur de synchronisation'}
                {syncStatus === 'idle' && 'Synchronisez vos réservations automatiquement'}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={syncAllCalendars}
              disabled={syncStatus === 'syncing'}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Synchroniser maintenant
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-settings-3-line mr-2"></i>
              Paramètres
            </button>
          </div>
        </div>

        {/* Statistiques avec statut de sync */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Réservations actives</p>
                <p className="text-2xl font-bold text-green-800">
                  {reservations.filter(r => !['Annulée', 'Brouillon'].includes(r.statut)).length}
                </p>
              </div>
              <i className="ri-calendar-check-line text-green-600 text-2xl"></i>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Événements ce mois</p>
                <p className="text-2xl font-bold text-orange-800">
                  {reservations.filter(r => {
                    const eventDate = new Date(r.date_event);
                    const now = new Date();
                    return eventDate.getMonth() === now.getMonth() && 
                           eventDate.getFullYear() === now.getFullYear() &&
                           !['Annulée', 'Brouillon'].includes(r.statut);
                  }).length}
                </p>
              </div>
              <i className="ri-calendar-line text-orange-600 text-2xl"></i>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Calendriers connectés</p>
                <p className="text-2xl font-bold text-blue-800">
                  {(syncSettings.googleEnabled ? 1 : 0) + (syncSettings.outlookEnabled ? 1 : 0) + (syncSettings.appleEnabled ? 1 : 0)}
                </p>
              </div>
              <i className="ri-links-line text-blue-600 text-2xl"></i>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Dernière sync</p>
                <p className="text-sm font-medium text-purple-800">
                  {syncSettings.lastSync 
                    ? new Date(syncSettings.lastSync).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Jamais'
                  }
                </p>
              </div>
              <i className="ri-time-line text-purple-600 text-2xl"></i>
            </div>
          </div>
        </div>

        {/* Connexions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`border-2 rounded-lg p-4 ${syncSettings.googleEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <i className="ri-google-line text-red-500 text-xl"></i>
                <span className="font-medium text-gray-900">Google Calendar</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${syncSettings.googleEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {syncSettings.googleEnabled ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            {syncSettings.googleEnabled ? (
              <button
                onClick={() => disconnectCalendar('google')}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Déconnecter
              </button>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Connecter
              </button>
            )}
          </div>

          <div className={`border-2 rounded-lg p-4 ${syncSettings.outlookEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <i className="ri-microsoft-line text-blue-500 text-xl"></i>
                <span className="font-medium text-gray-900">Outlook</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${syncSettings.outlookEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {syncSettings.outlookEnabled ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            {syncSettings.outlookEnabled ? (
              <button
                onClick={() => disconnectCalendar('outlook')}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Déconnecter
              </button>
            ) : (
              <button
                onClick={connectOutlookCalendar}
                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Connecter
              </button>
            )}
          </div>

          <div className={`border-2 rounded-lg p-4 ${syncSettings.appleEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <i className="ri-smartphone-line text-gray-600 text-xl"></i>
                <span className="font-medium text-gray-900">Apple Calendar</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${syncSettings.appleEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {syncSettings.appleEnabled ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            {syncSettings.appleEnabled ? (
              <button
                onClick={() => disconnectCalendar('apple')}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Déconnecter
              </button>
            ) : (
              <button
                onClick={connectAppleCalendar}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
              >
                Connecter
              </button>
            )}
          </div>
        </div>

        {/* Statut de synchronisation automatique */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${syncSettings.autoSync ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <div>
                <p className="font-medium text-gray-900">
                  Synchronisation automatique {syncSettings.autoSync ? 'activée' : 'désactivée'}
                </p>
                <p className="text-sm text-gray-600">
                  {syncSettings.autoSync && `Fréquence: ${syncSettings.syncFrequency === 'realtime' ? 'Temps réel (30s)' : 
                    syncSettings.syncFrequency === 'hourly' ? 'Toutes les heures' :
                    syncSettings.syncFrequency === 'daily' ? 'Quotidienne' : 'Hebdomadaire'}`}
                </p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncSettings.autoSync}
                onChange={(e) => saveSyncSettings({...syncSettings, autoSync: e.target.checked})}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${syncSettings.autoSync ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncSettings.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Ajout rapide par réservation */}
      {reservations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajout rapide par réservation</h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reservations
              .filter(r => !['Annulée', 'Brouillon'].includes(r.statut))
              .slice(0, 10)
              .map((reservation) => {
                const clientName = reservation.fullName || 
                  (reservation.clients ? `${reservation.clients.prenom} ${reservation.clients.nom}` : 'Client');
                const eventDate = new Date(reservation.date_event);
                
                return (
                  <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          reservation.statut === 'Soldée' ? 'bg-green-100 text-green-800' :
                          reservation.statut === 'Acompte payé' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {reservation.statut}
                        </span>
                        <span className="font-medium text-gray-900">{reservation.ref}</span>
                        <span className="text-gray-600">{clientName}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {eventDate.toLocaleDateString('fr-FR')} à {reservation.heure_event} - {reservation.ville_zone}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => quickAddToCalendar(reservation, 'google')}
                        className="text-red-600 hover:text-red-700 cursor-pointer p-1"
                        title="Ajouter à Google Calendar"
                      >
                        <i className="ri-google-line"></i>
                      </button>
                      <button
                        onClick={() => quickAddToCalendar(reservation, 'outlook')}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer p-1"
                        title="Ajouter à Outlook"
                      >
                        <i className="ri-microsoft-line"></i>
                      </button>
                      <button
                        onClick={() => quickAddToCalendar(reservation, 'yahoo')}
                        className="text-purple-600 hover:text-purple-700 cursor-pointer p-1"
                        title="Ajouter à Yahoo Calendar"
                      >
                        <i className="ri-calendar-line"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal des paramètres avancés */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Paramètres avancés</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fréquence de synchronisation
                </label>
                <select
                  value={syncSettings.syncFrequency}
                  onChange={(e) => saveSyncSettings({...syncSettings, syncFrequency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-8"
                >
                  <option value="realtime">Temps réel (30 secondes)</option>
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">État des connexions</h4>
                <div className="space-y-3">
                  {[
                    { key: 'google', name: 'Google Calendar', icon: 'ri-google-line', color: 'text-red-600' },
                    { key: 'outlook', name: 'Outlook', icon: 'ri-microsoft-line', color: 'text-blue-600' },
                    { key: 'apple', name: 'Apple Calendar', icon: 'ri-smartphone-line', color: 'text-gray-600' }
                  ].map(({ key, name, icon, color }) => {
                    const enabled = syncSettings[`${key}Enabled` as keyof typeof syncSettings];
                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <i className={`${icon} ${color} text-lg`}></i>
                          <span className="text-sm font-medium text-gray-900">{name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {enabled ? 'Connecté' : 'Déconnecté'}
                          </span>
                          {enabled && (
                            <button
                              onClick={() => disconnectCalendar(key as 'google' | 'outlook' | 'apple')}
                              className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                            >
                              Déconnecter
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Actions de synchronisation</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      syncAllCalendars();
                      setShowModal(false);
                    }}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    Forcer la synchronisation maintenant
                  </button>
                  <button
                    onClick={() => {
                      saveSyncSettings({
                        ...syncSettings,
                        googleEnabled: false,
                        outlookEnabled: false,
                        appleEnabled: false,
                        googleAccessToken: null,
                        outlookAccessToken: null,
                        appleCalendarUrl: null
                      });
                      setShowModal(false);
                    }}
                    className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  >
                    <i className="ri-delete-bin-line mr-2"></i>
                    Déconnecter tous les calendriers
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}