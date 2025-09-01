
'use client';

interface AlertItem {
  ref: string;
  client: string;
  echeance?: string;
  montant: number;
  type?: string;
}

interface AlertCardProps {
  type: 'acompte_urgent' | 'solde_urgent' | 'caution';
  title: string;
  count: number;
  items: AlertItem[];
}

export default function AlertCard({ type, title, count, items }: AlertCardProps) {
  const getCardStyle = () => {
    switch (type) {
      case 'acompte_urgent':
        return 'border-red-100 bg-red-50/50';
      case 'solde_urgent':
        return 'border-orange-100 bg-orange-50/50';
      case 'caution':
        return 'border-blue-100 bg-blue-50/50';
      default:
        return 'border-gray-100 bg-gray-50/50';
    }
  };

  const getIconStyle = () => {
    switch (type) {
      case 'acompte_urgent':
        return 'text-red-600 bg-red-100';
      case 'solde_urgent':
        return 'text-orange-600 bg-orange-100';
      case 'caution':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'acompte_urgent':
        return 'ri-alarm-warning-line';
      case 'solde_urgent':
        return 'ri-time-line';
      case 'caution':
        return 'ri-shield-check-line';
      default:
        return 'ri-information-line';
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case 'acompte_urgent':
        return count > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600';
      case 'solde_urgent':
        return count > 0 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600';
      case 'caution':
        return count > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  return (
    <div className={`rounded-xl border ${getCardStyle()} hover:shadow-sm transition-all duration-200`}>
      <div className="p-4 border-b border-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconStyle()}`}>
              <i className={`${getIcon()} text-sm`}></i>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
            </div>
          </div>
          <span className={`${getBadgeStyle()} px-2.5 py-1 rounded-full text-xs font-medium`}>
            {count}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        {count === 0 ? (
          <div className="text-center py-4">
            <i className="ri-check-double-line text-2xl text-green-500 mb-2"></i>
            <p className="text-sm text-gray-600">Tout est à jour</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 2).map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.ref}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.client}</p>
                    {item.echeance && (
                      <p className="text-xs text-gray-400 mt-1">
                        <i className="ri-calendar-line mr-1"></i>
                        {new Date(item.echeance).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.montant} €</p>
                    <button className="text-xs bg-gray-900 hover:bg-gray-800 text-white px-3 py-1 rounded-full mt-1 cursor-pointer whitespace-nowrap transition-colors duration-200">
                      Traiter
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {count > 2 && (
              <button className="w-full text-center text-sm bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-lg border border-gray-200 cursor-pointer font-medium transition-colors duration-200">
                Voir {count - 2} autres alertes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
