
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PDFGenerator } from './PDFGenerator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ArchiveFile {
  name: string;
  id: string;
  updated_at: string;
  metadata: {
    size: number;
    mimetype: string;
  } | Record<string, any>;
}

interface StorageManagerProps {
  bucketName?: string;
  folder?: string;
  onFileSelect?: (file: ArchiveFile) => void;
}

export default function StorageManager({ 
  bucketName = 'documents', 
  folder = 'recus',
  onFileSelect 
}: StorageManagerProps) {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    lastUpload: null as string | null
  });

  useEffect(() => {
    loadFiles();
  }, [selectedYear]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const folderPath = selectedYear ? `${folder}/${selectedYear}` : folder;
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'updated_at', order: 'desc' }
        });

      if (error) {
        console.error('Erreur lors du chargement des fichiers:', error);
        return;
      }

      setFiles(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (fileList: ArchiveFile[]) => {
    const totalFiles = fileList.length;
    const totalSize = fileList.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
    const lastUpload = fileList.length > 0 ? fileList[0].updated_at : null;
    
    setStats({ totalFiles, totalSize, lastUpload });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = async (file: ArchiveFile) => {
    try {
      const folderPath = selectedYear ? `${folder}/${selectedYear}` : folder;
      const filePath = `${folderPath}/${file.name}`;
      
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (urlData.publicUrl) {
        await PDFGenerator.downloadFromStorage(urlData.publicUrl, file.name);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  const deleteFile = async (file: ArchiveFile) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${file.name} ?`)) return;
    
    try {
      const folderPath = selectedYear ? `${folder}/${selectedYear}` : folder;
      const filePath = `${folderPath}/${file.name}`;
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) throw error;
      
      // Recharger la liste
      loadFiles();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du fichier');
    }
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push(year.toString());
    }
    return years;
  };

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Archive des reçus</h2>
            <p className="text-gray-600">Stockage cloud sécurisé</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Toutes les années</option>
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-file-list-line text-blue-600 text-xl mr-3"></i>
              <div>
                <p className="text-sm text-blue-600 font-medium">Fichiers archivés</p>
                <p className="text-2xl font-bold text-blue-700">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-database-line text-green-600 text-xl mr-3"></i>
              <div>
                <p className="text-sm text-green-600 font-medium">Espace utilisé</p>
                <p className="text-2xl font-bold text-green-700">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <i className="ri-time-line text-orange-600 text-xl mr-3"></i>
              <div>
                <p className="text-sm text-orange-600 font-medium">Dernier archivage</p>
                <p className="text-sm font-semibold text-orange-700">
                  {stats.lastUpload 
                    ? new Date(stats.lastUpload).toLocaleDateString('fr-FR')
                    : 'Aucun'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des fichiers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Fichiers archivés {selectedYear && `(${selectedYear})`}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <i className="ri-folder-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {selectedYear ? `Aucun fichier archivé en ${selectedYear}` : 'Aucun fichier archivé'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fichier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taille
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'archivage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <i className="ri-file-pdf-line text-red-500 text-xl mr-3"></i>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          <div className="text-sm text-gray-500">PDF</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(file.metadata?.size || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(file.updated_at).toLocaleDateString('fr-FR')}
                      <div className="text-xs text-gray-500">
                        {new Date(file.updated_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadFile(file)}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Télécharger"
                        >
                          <i className="ri-download-line"></i>
                        </button>
                        <button
                          onClick={() => deleteFile(file)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                          title="Supprimer"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                        {onFileSelect && (
                          <button
                            onClick={() => onFileSelect(file)}
                            className="text-green-600 hover:text-green-800 cursor-pointer"
                            title="Sélectionner"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
