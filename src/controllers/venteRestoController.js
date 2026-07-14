const VenteResto = require('../models/VenteResto');
const StockBoisson = require('../models/StockBoisson');
const StockNourriture = require('../models/StockNourriture');
const { ajouterLog } = require('../services/auditService');

const venteRestoController = {
  async createVente(req, res) {
    try {
      const vente = await VenteResto.create(req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'VENTE_RESTRO',
        niveau: 'INFO',
        table_concernee: 'ventes_resto',
        enregistrement_id: vente.id_facture_rst,
        nouvelles_valeurs: vente,
        details: `Creation d une commande restaurant table ${vente.numero_table}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: vente,
        message: 'Commande creee avec succes'
      });
    } catch (error) {
      console.error('Erreur creation vente resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation de la commande'
      });
    }
  },

  async getVentes(req, res) {
    try {
      const { limit, offset, statut, serveur_id, date_debut, date_fin } = req.query;
      const ventes = await VenteResto.findAll({ 
        limit, offset, statut, serveur_id, date_debut, date_fin 
      });
      
      res.json({
        success: true,
        data: ventes,
        count: ventes.length
      });
    } catch (error) {
      console.error('Erreur recuperation ventes resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des commandes'
      });
    }
  },

  async getVenteById(req, res) {
    try {
      const { id } = req.params;
      const vente = await VenteResto.findById(id);
      
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvee'
        });
      }

      res.json({
        success: true,
        data: vente
      });
    } catch (error) {
      console.error('Erreur recuperation vente resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de la commande'
      });
    }
  },

  async updateVente(req, res) {
    try {
      const { id } = req.params;
      
      const ancienneVente = await VenteResto.findById(id);
      if (!ancienneVente) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvee'
        });
      }

      const vente = await VenteResto.update(id, req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_resto',
        enregistrement_id: id,
        anciennes_valeurs: ancienneVente,
        nouvelles_valeurs: vente,
        details: 'Mise a jour d une commande restaurant',
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: vente,
        message: 'Commande mise a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour vente resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour de la commande'
      });
    }
  },

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      if (!statut) {
        return res.status(400).json({
          success: false,
          error: 'Statut requis'
        });
      }

      const vente = await VenteResto.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvee'
        });
      }

      // Si le statut est 'paye', verifier les stocks
      if (statut === 'paye' && vente.statut === 'en_preparation') {
        // La verification de stock est geree par le trigger PostgreSQL
        // On laisse la base de donnees faire son travail
      }

      const resultat = await VenteResto.updateStatus(
        id, 
        statut, 
        req.user.id, 
        req.user.nom
      );
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_resto',
        enregistrement_id: id,
        anciennes_valeurs: { statut: vente.statut },
        nouvelles_valeurs: { statut: statut },
        details: `Changement de statut: ${vente.statut} -> ${statut}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: resultat,
        message: `Statut change en ${statut}`
      });
    } catch (error) {
      console.error('Erreur mise a jour statut vente resto:', error);
      
      // Verifier si c'est une erreur de stock
      if (error.message && error.message.includes('Stock insuffisant')) {
        return res.status(400).json({
          success: false,
          error: 'Stock insuffisant pour cette commande'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erreur lors du changement de statut'
      });
    }
  },

  async getVentesDuJour(req, res) {
    try {
      const ventes = await VenteResto.getVentesDuJour();
      
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

  async getStatsParServeur(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      const stats = await VenteResto.getStatsParServeur(date_debut, date_fin);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur recuperation stats par serveur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des statistiques'
      });
    }
  },

  async annulerVente(req, res) {
    try {
      const { id } = req.params;
      
      const vente = await VenteResto.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvee'
        });
      }

      if (vente.statut === 'paye') {
        return res.status(400).json({
          success: false,
          error: 'Impossible d annuler une commande deja payee'
        });
      }

      const resultat = await VenteResto.updateStatus(id, 'annule');
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'ANNULATION_VENTE',
        niveau: 'WARNING',
        table_concernee: 'ventes_resto',
        enregistrement_id: id,
        anciennes_valeurs: { statut: vente.statut },
        nouvelles_valeurs: { statut: 'annule' },
        details: `Annulation de la commande #${id}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: resultat,
        message: 'Commande annulee avec succes'
      });
    } catch (error) {
      console.error('Erreur annulation vente resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l annulation de la commande'
      });
    }
  },

  async deleteVente(req, res) {
    try {
      const { id } = req.params;
      
      const vente = await VenteResto.findById(id);
      if (!vente) {
        return res.status(404).json({
          success: false,
          error: 'Commande non trouvee'
        });
      }

      await VenteResto.delete(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'ventes_resto',
        enregistrement_id: id,
        anciennes_valeurs: vente,
        details: 'Suppression d une commande restaurant',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Commande supprimee avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression vente resto:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de la commande'
      });
    }
  }
};

module.exports = venteRestoController;