const AuditLog = require('../models/AuditLog');
const { ajouterLog } = require('../services/auditService');

const auditController = {
  async getLogs(req, res) {
    try {
      const { 
        limit, offset, utilisateur_id, action, niveau, 
        table_concernee, date_debut, date_fin 
      } = req.query;

      const logs = await AuditLog.findAll({
        limit, offset, utilisateur_id, action, niveau,
        table_concernee, date_debut, date_fin
      });

      res.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error) {
      console.error('Erreur recuperation logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des logs'
      });
    }
  },

  async getLogById(req, res) {
    try {
      const { id } = req.params;
      const log = await AuditLog.findById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Log non trouve'
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      console.error('Erreur recuperation log:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation du log'
      });
    }
  },

  async getLogsByUtilisateur(req, res) {
    try {
      const { utilisateur_id } = req.params;
      const { limit, offset } = req.query;

      const logs = await AuditLog.findByUtilisateur(utilisateur_id, { limit, offset });

      res.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error) {
      console.error('Erreur recuperation logs par utilisateur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des logs'
      });
    }
  },

  async getLogsByAction(req, res) {
    try {
      const { action } = req.params;
      const { limit, offset } = req.query;

      const logs = await AuditLog.findByAction(action, { limit, offset });

      res.json({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error) {
      console.error('Erreur recuperation logs par action:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des logs'
      });
    }
  },

  async getStats(req, res) {
    try {
      const { periode } = req.query;
      const stats = await AuditLog.getStats(periode || 'jour');

      res.json({
        success: true,
        data: stats,
        periode: periode || 'jour'
      });
    } catch (error) {
      console.error('Erreur recuperation stats audit:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des statistiques'
      });
    }
  },

  async getActionsParNiveau(req, res) {
    try {
      const stats = await AuditLog.getActionsParNiveau();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur recuperation actions par niveau:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des statistiques'
      });
    }
  },

  async deleteOldLogs(req, res) {
    try {
      const { jours } = req.query;
      const nbJours = jours || 180;

      const logs = await AuditLog.deleteOldLogs(nbJours);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'audit_log',
        details: `Suppression des logs de plus de ${nbJours} jours (${logs.length} logs supprimes)`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `${logs.length} logs supprimes avec succes`,
        logs_supprimes: logs.length
      });
    } catch (error) {
      console.error('Erreur suppression anciens logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression des anciens logs'
      });
    }
  },

  async deleteLog(req, res) {
    try {
      const { id } = req.params;

      const log = await AuditLog.findById(id);
      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Log non trouve'
        });
      }

      await AuditLog.delete(id);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'audit_log',
        enregistrement_id: id,
        anciennes_valeurs: log,
        details: 'Suppression d un log d audit',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Log supprime avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression log:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression du log'
      });
    }
  }
};

module.exports = auditController;