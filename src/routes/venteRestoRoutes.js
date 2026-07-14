const express = require('express');
const router = express.Router();
const venteRestoController = require('../controllers/venteRestoController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES, ROLES_GROUPS } = require('../middleware/role');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// ============ ROUTES VENTES RESTO ============

// Creer une commande (serveur, admin, gerant)
router.post(
  '/',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.createVente
);

// Lister toutes les commandes (tous les roles restaurent)
router.get(
  '/',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.getVentes
);

// Recuperer une commande par ID (tous les roles restaurent)
router.get(
  '/:id',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.getVenteById
);

// Mettre a jour une commande (admin, gerant)
router.put(
  '/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  venteRestoController.updateVente
);

// Changer le statut d'une commande (tous les roles restaurent)
router.patch(
  '/:id/statut',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.updateStatus
);

// Annuler une commande (serveur, admin, gerant)
router.patch(
  '/:id/annuler',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.annulerVente
);

// Recuperer les ventes du jour (tous les roles restaurent)
router.get(
  '/stats/journalieres',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.getVentesDuJour
);

// Recuperer les statistiques par serveur (admin, gerant, caissier)
router.get(
  '/stats/serveur',
  authorize(ROLES_GROUPS.RESTAURANT),
  venteRestoController.getStatsParServeur
);

// Supprimer une commande (admin seulement)
router.delete(
  '/:id',
  authorize([ROLES.ADMIN]),
  venteRestoController.deleteVente
);

module.exports = router;