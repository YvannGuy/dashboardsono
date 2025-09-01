
'use client';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'gray' | 'red' | 'green' | 'blue' | 'orange';
  trend?: string;
}

export default function KPICard({ title, value, icon, color, trend }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          color === 'red' ? 'bg-red-100' :
          color === 'green' ? 'bg-green-100' :
          color === 'blue' ? 'bg-blue-100' :
          color === 'orange' ? 'bg-orange-100' :
          'bg-gray-100'
        }`}>
          <i className={`${icon} text-lg ${
            color === 'red' ? 'text-red-600' :
            color === 'green' ? 'text-green-600' :
            color === 'blue' ? 'text-blue-600' :
            color === 'orange' ? 'text-orange-600' :
            'text-gray-600'
          }`}></i>
        </div>
        {trend && (
          <div className="bg-gray-100 rounded-full px-3 py-1">
            <span className={`text-xs font-medium ${
              trend.startsWith('+') ? 'text-green-600' : 
              trend.startsWith('-') ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend}
            </span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm text-gray-500 font-medium mb-2">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">vs mois dernier</p>
      </div>
    </div>
  );
}
