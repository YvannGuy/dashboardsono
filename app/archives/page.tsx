
'use client';

import Layout from '../components/Layout';
import StorageManager from '../components/StorageManager';

export default function ArchivesPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Archives documentaires</h1>
          <p className="text-gray-600">Gestion centralisée de vos documents stockés dans le cloud</p>
        </div>

        <div className="space-y-8">
          {/* Archive des reçus */}
          <StorageManager 
            bucketName="documents" 
            folder="recus"
          />
          
          {/* Informations sur le stockage */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <i className="ri-information-line text-blue-600 text-xl mr-3 mt-1"></i>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Stockage cloud sécurisé</h3>
                <div className="text-blue-800 space-y-2">
                  <p>• <strong>Archivage automatique</strong> - Tous les reçus sont sauvegardés automatiquement</p>
                  <p>• <strong>Organisation par année</strong> - Classification chronologique pour faciliter les recherches</p>
                  <p>• <strong>Accès permanent</strong> - Téléchargement disponible 24h/24</p>
                  <p>• <strong>Sécurité</strong> - Stockage chiffré dans l'infrastructure Supabase</p>
                  <p>• <strong>Sauvegarde</strong> - Réplication automatique pour éviter les pertes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-3 rounded-lg font-medium cursor-pointer whitespace-nowrap text-left">
                <i className="ri-file-search-line text-xl mr-2"></i>
                <div>
                  <div className="font-semibold">Rechercher un reçu</div>
                  <div className="text-sm opacity-75">Par référence ou client</div>
                </div>
              </button>
              
              <button className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-3 rounded-lg font-medium cursor-pointer whitespace-nowrap text-left">
                <i className="ri-download-cloud-line text-xl mr-2"></i>
                <div>
                  <div className="font-semibold">Export annuel</div>
                  <div className="text-sm opacity-75">Télécharger toute l'année</div>
                </div>
              </button>
              
              <button className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-3 rounded-lg font-medium cursor-pointer whitespace-nowrap text-left">
                <i className="ri-pie-chart-line text-xl mr-2"></i>
                <div>
                  <div className="font-semibold">Statistiques</div>
                  <div className="text-sm opacity-75">Rapport d'utilisation</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
