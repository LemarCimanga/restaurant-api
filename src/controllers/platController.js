const Plat = require('../models/Plat');
const { ajouterLog } = require('../services/auditService');

const platController = {
  // Créer un plat
  async create(req, res) {
    try {
      const plat = await Plat.create({
        ...req.body,
        created_by: req.user.id
      });

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'plats',
        enregistrement_id: plat.id_plat,
        nouvelles_valeurs: plat,
        details: `Creation du plat: ${plat.nom}`,
        ip_address: req.ip
      });

      res.status(201).json({ success: true, data: plat });
    } catch (error) {
      console.error('Erreur creation plat:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la creation du plat' });
    }
  },

  // Lister les plats
  async findAll(req, res) {
    try {
      const { limit, offset, categorie, est_disponible, search } = req.query;
      const plats = await Plat.findAll({ limit, offset, categorie, est_disponible, search });
      res.json({ success: true, data: plats, count: plats.length });
    } catch (error) {
      console.error('Erreur recuperation plats:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la recuperation des plats' });
    }
  },

  // Récupérer un plat par ID
  async findById(req, res) {
    try {
      const { id } = req.params;
      const plat = await Plat.findById(id);
      if (!plat) {
        return res.status(404).json({ success: false, error: 'Plat non trouve' });
      }
      res.json({ success: true, data: plat });
    } catch (error) {
      console.error('Erreur recuperation plat:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la recuperation du plat' });
    }
  },

  // Mettre à jour un plat
  async update(req, res) {
    try {
      const { id } = req.params;
      const ancienPlat = await Plat.findById(id);
      if (!ancienPlat) {
        return res.status(404).json({ success: false, error: 'Plat non trouve' });
      }

      const plat = await Plat.update(id, req.body);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'plats',
        enregistrement_id: id,
        anciennes_valeurs: ancienPlat,
        nouvelles_valeurs: plat,
        details: `Mise a jour du plat: ${plat.nom}`,
        ip_address: req.ip
      });

      res.json({ success: true, data: plat });
    } catch (error) {
      console.error('Erreur mise a jour plat:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la mise a jour du plat' });
    }
  },

  // Supprimer un plat
  async delete(req, res) {
    try {
      const { id } = req.params;
      const plat = await Plat.findById(id);
      if (!plat) {
        return res.status(404).json({ success: false, error: 'Plat non trouve' });
      }

      await Plat.delete(id);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'plats',
        enregistrement_id: id,
        anciennes_valeurs: plat,
        details: `Suppression du plat: ${plat.nom}`,
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Plat supprime avec succes' });
    } catch (error) {
      console.error('Erreur suppression plat:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la suppression du plat' });
    }
  },

  // ============ FONCTIONS CUISINE ============

  // Démarrer la préparation d'une commande
  async demarrerPreparation(req, res) {
    try {
      const { vente_id } = req.params;
      const agent_id = req.user.id;

      const query = `SELECT demarrer_preparation($1, $2)`;
      await pool.query(query, [vente_id, agent_id]);

      await ajouterLog({
        utilisateur_id: agent_id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_resto',
        enregistrement_id: vente_id,
        details: `Debut preparation commande #${vente_id}`,
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Preparation demarree avec succes' });
    } catch (error) {
      console.error('Erreur demarrage preparation:', error);
      res.status(500).json({ success: false, error: error.message || 'Erreur lors du demarrage' });
    }
  },

  // Terminer la préparation d'une commande
  async terminerPreparation(req, res) {
    try {
      const { vente_id } = req.params;

      const query = `SELECT terminer_preparation($1)`;
      await pool.query(query, [vente_id]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'ventes_resto',
        enregistrement_id: vente_id,
        details: `Fin preparation commande #${vente_id}`,
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Preparation terminee avec succes' });
    } catch (error) {
      console.error('Erreur fin preparation:', error);
      res.status(500).json({ success: false, error: error.message || 'Erreur lors de la fin' });
    }
  },

  // Voir les commandes en cuisine (vue)
  async getCommandesCuisine(req, res) {
    try {
      const query = `SELECT * FROM vue_commandes_cuisine`;
      const result = await pool.query(query);
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Erreur recuperation commandes cuisine:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la recuperation' });
    }
  }
};

module.exports = platController;