const VenteBoutique = require('../models/VenteBoutique');
const StockBoutique = require('../models/StockBoutique');
const { ajouterLog } = require('../services/auditService');

const venteBoutiqueController = {
  async createVente(req, res) {
    try {
      const vente = await VenteBoutique.create(req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'VENTE_BOUTIQUE',
        niveau: 'INFO',
        table_concernee: 'ventes_boutique',
        enregistrement_id: vente.id_vente_bqt,
        nouvelles_valeurs: vente,
        details: `Vente boutique pour ${vente.nom_client}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: vente,
        message: 'Vente creee avec succes'
      });
    } catch (error) {
      console.error('Erreur creation vente boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation de la vente'
      });
    }
  },

  async getVentes(req, res) {
    try {
      const { limit, offset, vendeur_id, statut, date_debut, date_fin } = req.query;
      const ventes = await VenteBoutique.findAll({ 
        limit, offset, vendeur_id, statut, date_debut, date_fin 
      });
      
      res.json({
        success: true,
        data: ventes,
        count: ventes.length
      });
    } catch (error) {
      console.error('Erreur recuperation ventes boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des ventes'
      });
    }
  },

  async getVenteById(req, res) {
    try {
      const { id } = req.params;
      const vente = await VenteBoutique.findById(id);
      
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Vente non trouvee'
        });
      }

      res.json({
        success: true,
        data: vente
      });
    } catch (error) {
      console.error('Erreur recuperation vente boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de la vente'
      });
    }
  },

  async updateVente(req, res) {
    try {
      const { id } = req.params;
      
      const ancienneVente = await VenteBoutique.findById(id);
      if (!ancienneVente) {
        return res.status(404).json({
          success: false,
          error: 'Vente non trouvee'
        });
      }

      const vente = await VenteBoutique.update(id, req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_boutique',
        enregistrement_id: id,
        anciennes_valeurs: ancienneVente,
        nouvelles_valeurs: vente,
        details: 'Mise a jour d une vente boutique',
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: vente,
        message: 'Vente mise a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour vente boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour de la vente'
      });
    }
  },

  async annulerVente(req, res) {
    try {
      const { id } = req.params;
      
      const vente = await VenteBoutique.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Vente non trouvee'
        });
      }

      if (vente.statut === 'annulee') {
        return res.status(400).json({
          success: false,
          error: 'Cette vente est deja annulee'
        });
      }

      const resultat = await VenteBoutique.updateStatus(id, 'annulee');
      
      // Le trigger PostgreSQL remet automatiquement les stocks
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'ANNULATION_VENTE',
        niveau: 'WARNING',
        table_concernee: 'ventes_boutique',
        enregistrement_id: id,
        anciennes_valeurs: { statut: vente.statut },
        nouvelles_valeurs: { statut: 'annulee' },
        details: `Annulation de la vente #${id}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: resultat,
        message: 'Vente annulee avec succes, stock restaure'
      });
    } catch (error) {
      console.error('Erreur annulation vente boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l annulation de la vente'
      });
    }
  },

  async getVentesDuJour(req, res) {
    try {
      const ventes = await VenteBoutique.getVentesDuJour();
      
      res.json({
        success: true,
        data: ventes,
        count: ventes.length
      });
    } catch (error) {
      console.error('Erreur recuperation ventes du jour:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des ventes du jour'
      });
    }
  },

  async getStatsParVendeur(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      const stats = await VenteBoutique.getStatsParVendeur(date_debut, date_fin);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur recuperation stats par vendeur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des statistiques'
      });
    }
  },

  async marquerWhatsappEnvoye(req, res) {
    try {
      const { id } = req.params;
      
      const vente = await VenteBoutique.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Vente non trouvee'
        });
      }

      const resultat = await VenteBoutique.marquerWhatsappEnvoye(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_boutique',
        enregistrement_id: id,
        details: `WhatsApp envoye pour la vente #${id}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: resultat,
        message: 'WhatsApp marque comme envoye'
      });
    } catch (error) {
      console.error('Erreur marquage whatsapp:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du marquage whatsapp'
      });
    }
  },

  async deleteVente(req, res) {
    try {
      const { id } = req.params;
      
      const vente = await VenteBoutique.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Vente non trouvee'
        });
      }

      await VenteBoutique.delete(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'ventes_boutique',
        enregistrement_id: id,
        anciennes_valeurs: vente,
        details: 'Suppression d une vente boutique',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Vente supprimee avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression vente boutique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de la vente'
      });
    }
  }
};

module.exports = venteBoutiqueController;