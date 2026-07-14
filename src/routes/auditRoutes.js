const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/role');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// ============ ROUTES AUDIT ============

// Seul l'admin a acces aux logs d'audit
router.use(authorize([ROLES.ADMIN]));

// Lister tous les logs (avec filtres)
router.get('/', auditController.getLogs);

// Recuperer un log par ID
router.get('/:id', auditController.getLogById);

// Recuperer les logs par utilisateur
router.get('/utilisateur/:utilisateur_id', auditController.getLogsByUtilisateur);

// Recuperer les logs par action
router.get('/action/:action', auditController.getLogsByAction);

// Statistiques des logs
router.get('/stats/globales', auditController.getStats);

// Nombre de logs par niveau
router.get('/stats/niveaux', auditController.getActionsParNiveau);

// Supprimer les anciens logs (plus de X jours)
router.delete('/cleanup', auditController.deleteOldLogs);

// Supprimer un log specifique
router.delete('/:id', auditController.deleteLog);

module.exports = router;