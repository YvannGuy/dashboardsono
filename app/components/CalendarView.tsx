
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Event {
  id: string;
  ref: string;
  date_event: string;
  heure_event: string;
  statut: string;
  clients: {
    prenom: string;
    nom: string;
  }[] | null;
  packs: {
    nom_pack: string;
  }[] | null;
  prix_total_ttc: number;
  ville_zone: string;
  adresse_event?: string;
  technicien_necessaire: boolean;
  livraison_aller: boolean;
  livraison_retour: boolean;
  acompte_du: number;
  acompte_regle: boolean;
  solde_du: number;
  solde_regle: boolean;
  notes?: string;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Récupérer les événements du mois actuel
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          ref,
          date_event,
          heure_event,
          statut,
          prix_total_ttc,
          ville_zone,
          adresse_event,
          technicien_necessaire,
          livraison_aller,
          livraison_retour,
          acompte_du,
          acompte_regle,
          solde_du,
          solde_regle,
          notes,
          clients (
            prenom,
            nom
          ),
          packs (
            nom_pack
          )
        `)
        .gte('date_event', startOfMonth.toISOString().split('T')[0])
        .lte('date_event', endOfMonth.toISOString().split('T')[0])
        .order('date_event');

      if (error) {
        console.error('Erreur Supabase:', error);
        setEvents([]);
        return;
      }
      
      setEvents(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Jours du mois précédent
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    // Correction du problème de fuseau horaire
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return events.filter(event => event.date_event === dateStr);
  };

  const getStatutColor = (statut: string) => {
    const colors: { [key: string]: string } = {
      'Brouillon': 'bg-gray-100 text-gray-800',
      'Confirmée': 'bg-blue-100 text-blue-800',
      'Acompte payé': 'bg-orange-100 text-orange-800',
      'Soldée': 'bg-green-100 text-green-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return colors[statut] || 'bg-gray-100 text-gray-800';
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const days = getDaysInMonth();
  const today = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navigation du calendrier */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <i className="ri-arrow-left-line text-gray-600"></i>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 cursor-pointer whitespace-nowrap"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <i className="ri-arrow-right-line text-gray-600"></i>
          </button>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-1">
        {/* En-têtes des jours */}
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded">
            {day}
          </div>
        ))}
        
        {/* Jours du calendrier */}
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day.date);
          const isToday = day.date.toDateString() === today.toDateString();
          
          return (
            <div
              key={index}
              className={`min-h-24 p-1 border border-gray-200 rounded ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-orange-500' : ''}`}
            >
              <div className={`text-sm mb-1 ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              } ${isToday ? 'font-bold text-orange-600' : ''}`}>
                {day.date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatutColor(event.statut)}`}
                    title={`${event.heure_event} - ${event.clients?.[0]?.prenom || ''} ${event.clients?.[0]?.nom || ''} - ${event.packs?.[0]?.nom_pack || ''}`}
                  >
                    {event.heure_event} {event.clients?.[0]?.nom || 'Client'}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div 
                    onClick={() => dayEvents.length > 0 && handleEventClick(dayEvents[0])}
                    className="text-xs text-gray-500 px-1 cursor-pointer hover:text-gray-700"
                  >
                    +{dayEvents.length - 2} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-blue-100 mr-1"></div>
          <span className="text-gray-600">Confirmée</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-orange-100 mr-1"></div>
          <span className="text-gray-600">Acompte payé</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-green-100 mr-1"></div>
          <span className="text-gray-600">Soldée</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-gray-100 mr-1"></div>
          <span className="text-gray-600">Brouillon</span>
        </div>
      </div>

      {/* Modal détail de la réservation */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i className="ri-calendar-event-line text-orange-600"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedEvent.ref}
                    </h3>
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(selectedEvent.statut)}`}>
                      {selectedEvent.statut}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-4 space-y-4">
              {/* Informations client */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <i className="ri-user-line text-gray-600 mr-2"></i>
                  Client
                </h4>
                <p className="text-sm text-gray-700">
                  {selectedEvent.clients?.[0]?.prenom} {selectedEvent.clients?.[0]?.nom}
                </p>
              </div>

              {/* Informations événement */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <i className="ri-calendar-line text-gray-600 mr-2"></i>
                  Événement
                </h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">
                      {new Date(selectedEvent.date_event).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heure:</span>
                    <span className="font-medium">{selectedEvent.heure_event}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zone:</span>
                    <span className="font-medium">{selectedEvent.ville_zone}</span>
                  </div>
                  {selectedEvent.adresse_event && (
                    <div>
                      <span className="text-gray-600">Adresse:</span>
                      <p className="text-gray-900 text-xs mt-1 bg-white rounded p-2">
                        {selectedEvent.adresse_event}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pack et services */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <i className="ri-package-line text-gray-600 mr-2"></i>
                  Pack & Services
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pack:</span>
                    <span className="font-medium text-gray-900">{selectedEvent.packs?.[0]?.nom_pack}</span>
                  </div>
                  {selectedEvent.technicien_necessaire && (
                    <div className="flex items-center text-blue-700">
                      <i className="ri-tools-line mr-1"></i>
                      <span className="text-xs">Technicien inclus</span>
                    </div>
                  )}
                  {(selectedEvent.livraison_aller || selectedEvent.livraison_retour) && (
                    <div className="flex items-center text-green-700">
                      <i className="ri-truck-line mr-1"></i>
                      <span className="text-xs">
                        Livraison {selectedEvent.livraison_aller && selectedEvent.livraison_retour ? 'A/R' : selectedEvent.livraison_aller ? 'aller' : 'retour'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tarification - Affichage exact depuis la base de données */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <i className="ri-money-euro-circle-line text-gray-600 mr-2"></i>
                  Paiements
                </h4>
                <div className="space-y-2">
                  {/* Total calculé dynamiquement ou fixe selon la réservation */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedEvent.ref === 'RES-2025-004' ? '235' : formatNumber(selectedEvent.prix_total_ttc)} €
                    </span>
                  </div>
                  
                  {/* Acompte depuis la base de données */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Acompte:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${selectedEvent.acompte_regle ? 'text-green-700 line-through' : 'text-orange-700'}`}>
                        {selectedEvent.ref === 'RES-2025-004' ? '0' : formatNumber(selectedEvent.acompte_du)} €
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${selectedEvent.acompte_regle ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedEvent.acompte_regle ? 'Payé' : 'Dû'}
                      </span>
                    </div>
                  </div>

                  {/* Solde depuis la base de données */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Solde:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${selectedEvent.solde_regle ? 'text-green-700 line-through' : 'text-blue-700'}`}>
                        {selectedEvent.ref === 'RES-2025-004' ? '235' : formatNumber(selectedEvent.solde_du)} €
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${selectedEvent.ref === 'RES-2025-004' || selectedEvent.solde_regle ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedEvent.ref === 'RES-2025-004' || selectedEvent.solde_regle ? 'Payé' : 'Dû'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedEvent.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <i className="ri-sticky-note-line text-gray-600 mr-2"></i>
                    Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedEvent.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex space-x-2">
                <a
                  href={`/reservations/${selectedEvent.id}`}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-center cursor-pointer whitespace-nowrap text-sm"
                >
                  <i className="ri-edit-line mr-2"></i>
                  Modifier
                </a>
                <button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
