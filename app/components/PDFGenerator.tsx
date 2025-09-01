
'use client';

import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PaiementData {
  id: string;
  type: string;
  montant_eur: number;
  moyen: string;
  date_paiement: string;
  created_at: string;
  reservations: {
    ref: string;
    date_event: string;
    clients: {
      prenom: string;
      nom: string;
      email: string;
      telephone: string;
      adresse?: string;
    };
    packs: {
      nom_pack: string;
    };
  };
}

export class PDFGenerator {
  static generateReceipt(paiement: PaiementData): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎨 Début génération PDF avec données:', paiement);

        // Vérification des données obligatoires
        if (!paiement.reservations?.clients) {
          throw new Error('Informations client manquantes');
        }
        if (!paiement.reservations?.packs) {
          throw new Error('Informations pack manquantes');
        }

        const pdf = new jsPDF();
        
        // Configuration des couleurs
        const primaryColor = [255, 107, 53]; // Orange Prisme
        const secondaryColor = [247, 147, 30]; // Orange clair
        const grayColor = [102, 102, 102];
        const darkColor = [51, 51, 51];

        // En-tête avec dégradé simulé
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, 210, 50, 'F');
        
        // Logo et titre
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(24);
        pdf.text('🎭 Prisme Studio', 105, 20, { align: 'center' });
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14);
        pdf.text('Reçu de paiement officiel', 105, 30, { align: 'center' });

        // Reset couleur texte
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        let yPos = 70;

        // Section informations du reçu
        pdf.setFillColor(248, 249, 250);
        pdf.rect(15, yPos - 5, 180, 35, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('Informations du reçu', 20, yPos + 5);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        
        // Grille d'informations
        const receiptNumber = paiement.id.substring(0, 8).toUpperCase();
        const issueDate = new Date(paiement.created_at || new Date()).toLocaleDateString('fr-FR');
        const paymentDate = new Date(paiement.date_paiement).toLocaleDateString('fr-FR');
        const issueTime = new Date(paiement.created_at || new Date()).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text('Numéro de reçu:', 20, yPos + 15);
        pdf.text('Date d\'émission:', 110, yPos + 15);
        pdf.text('Date du paiement:', 20, yPos + 25);
        pdf.text('Heure d\'enregistrement:', 110, yPos + 25);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        pdf.text(`#${receiptNumber}`, 55, yPos + 15);
        pdf.text(issueDate, 145, yPos + 15);
        pdf.text(paymentDate, 55, yPos + 25);
        pdf.text(issueTime, 155, yPos + 25);

        yPos += 50;

        // Section montant en évidence
        pdf.setFillColor(255, 243, 205);
        pdf.rect(15, yPos - 5, 180, 30, 'F');
        
        // Bordure gauche orange
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(15, yPos - 5, 4, 30, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(28);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        const montantFormate = paiement.montant_eur.toLocaleString('fr-FR');
        pdf.text(`${montantFormate} €`, 105, yPos + 10, { align: 'center' });

        // Badge type
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        const badgeColors: { [key: string]: number[] } = {
          'Acompte': [255, 243, 205],
          'Solde': [209, 231, 221],
          'Autre': [226, 227, 229]
        };
        const badgeTextColors: { [key: string]: number[] } = {
          'Acompte': [133, 100, 4],
          'Solde': [15, 81, 50],
          'Autre': [65, 70, 75]
        };
        
        const badgeColor = badgeColors[paiement.type] || badgeColors['Autre'];
        const badgeTextColor = badgeTextColors[paiement.type] || badgeTextColors['Autre'];
        
        pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        pdf.roundedRect(85, yPos + 15, 40, 8, 4, 4, 'F');
        pdf.setTextColor(badgeTextColor[0], badgeTextColor[1], badgeTextColor[2]);
        pdf.setFontSize(10);
        pdf.text(paiement.type, 105, yPos + 20, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text(`Moyen de paiement: ${paiement.moyen}`, 105, yPos + 30, { align: 'center' });

        yPos += 50;

        // Section client
        pdf.setFillColor(248, 249, 250);
        pdf.rect(15, yPos - 5, 180, 40, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('Informations client', 20, yPos + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text('Nom complet:', 20, yPos + 15);
        pdf.text('Email:', 110, yPos + 15);
        pdf.text('Téléphone:', 20, yPos + 25);
        pdf.text('Adresse:', 110, yPos + 25);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        const fullName = `${paiement.reservations.clients.prenom} ${paiement.reservations.clients.nom}`;
        pdf.text(fullName, 45, yPos + 15);
        pdf.text(paiement.reservations.clients.email, 125, yPos + 15);
        pdf.text(paiement.reservations.clients.telephone, 40, yPos + 25);
        pdf.text(paiement.reservations.clients.adresse || 'Non renseignée', 130, yPos + 25);

        yPos += 50;

        // Section réservation
        pdf.setFillColor(248, 249, 250);
        pdf.rect(15, yPos - 5, 180, 30, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text('Réservation associée', 20, yPos + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text('Référence:', 20, yPos + 15);
        pdf.text('Pack réservé:', 110, yPos + 15);
        pdf.text('Date de l\'événement:', 20, yPos + 25);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        pdf.text(paiement.reservations.ref, 40, yPos + 15);
        pdf.text(paiement.reservations.packs.nom_pack, 140, yPos + 15);
        const eventDate = new Date(paiement.reservations.date_event).toLocaleDateString('fr-FR');
        pdf.text(eventDate, 60, yPos + 25);

        yPos += 40;

        // QR Code placeholder
        pdf.setFillColor(221, 221, 221);
        pdf.rect(85, yPos, 40, 40, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text('QR Code', 105, yPos + 22, { align: 'center' });
        pdf.text('Scannez pour vérifier l\'authenticité', 105, yPos + 50, { align: 'center' });

        yPos += 65;

        // Notes importantes
        pdf.setDrawColor(238, 238, 238);
        pdf.line(15, yPos, 195, yPos);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        pdf.text('Notes importantes :', 20, yPos + 10);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        pdf.text('• Ce reçu fait foi de paiement pour la prestation mentionnée', 25, yPos + 18);
        pdf.text('• Conservez ce document pour vos archives', 25, yPos + 25);
        pdf.text('• En cas de question, contactez-nous avec la référence du reçu', 25, yPos + 32);

        // Footer
        const footerY = 270;
        pdf.setFillColor(52, 58, 64);
        pdf.rect(0, footerY, 210, 27, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('🎭 Prisme Studio', 105, footerY + 8, { align: 'center' });
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Location de matériel audiovisuel professionnel', 105, footerY + 15, { align: 'center' });
        pdf.text('Email: contact@prisme-studio.fr | Téléphone: 01 23 45 67 89', 105, footerY + 21, { align: 'center' });

        const now = new Date();
        const generatedText = `Document généré automatiquement le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
        pdf.setFontSize(8);
        pdf.setTextColor(200, 200, 200);
        pdf.text(generatedText, 105, footerY + 26, { align: 'center' });

        // Convertir en blob
        const pdfBlob = pdf.output('blob');
        console.log('✅ PDF généré avec succès');
        resolve(pdfBlob);
      } catch (error) {
        console.error('❌ Erreur lors de la génération PDF:', error);
        reject(error);
      }
    });
  }

  static async uploadToStorage(pdfBlob: Blob, filename: string, paiementId: string): Promise<string> {
    try {
      // Créer le chemin du fichier dans le storage
      const filePath = `recus/${new Date().getFullYear()}/${filename}`;
      
      // Upload du fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true // Remplace le fichier s'il existe déjà
        });

      if (error) {
        console.error('Erreur upload Storage:', error);
        throw error;
      }

      // Obtenir l'URL publique du fichier
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload vers Supabase Storage:', error);
      throw error;
    }
  }

  static async generateAndArchive(paiement: PaiementData): Promise<{ 
    pdfBlob: Blob; 
    filename: string; 
    storageUrl?: string; 
  }> {
    try {
      // Générer le PDF
      const pdfBlob = await PDFGenerator.generateReceipt(paiement);
      const filename = `recu-${paiement.id.substring(0, 8)}-${paiement.reservations.ref.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      
      let storageUrl: string | undefined;
      
      try {
        // Tenter l'upload vers Supabase Storage
        storageUrl = await PDFGenerator.uploadToStorage(pdfBlob, filename, paiement.id);
        console.log('Reçu archivé dans le cloud:', storageUrl);
      } catch (storageError) {
        console.warn('Impossible d\'archiver dans le cloud, génération locale uniquement:', storageError);
        // Continue sans archivage cloud
      }
      
      return { pdfBlob, filename, storageUrl };
    } catch (error) {
      console.error('Erreur lors de la génération/archivage:', error);
      throw error;
    }
  }

  static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async printPDF(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    
    return new Promise((resolve) => {
      iframe.onload = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          resolve();
        }, 100);
      };
      
      document.body.appendChild(iframe);
    });
  }

  static async downloadFromStorage(storageUrl: string, filename: string): Promise<void> {
    try {
      const response = await fetch(storageUrl);
      if (!response.ok) throw new Error('Erreur lors du téléchargement');
      
      const blob = await response.blob();
      PDFGenerator.downloadPDF(blob, filename);
    } catch (error) {
      console.error('Erreur lors du téléchargement depuis le storage:', error);
      throw error;
    }
  }
}
