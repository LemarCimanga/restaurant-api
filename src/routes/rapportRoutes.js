const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapportController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES, ROLES_GROUPS } = require('../middleware/role');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// ============ RAPPORTS VENTES RESTO ============

// Rapport ventes resto journalieres (tous les roles resto)
router.get(
  '/ventes/resto/journalieres',
  authorize(ROLES_GROUPS.RESTAURANT),
  rapportController.getVentesRestoJournalieres
);

// Rapport ventes resto par periode (tous les roles resto)
router.get(
  '/ventes/resto/periode',
  authorize(ROLES_GROUPS.RESTAURANT),
  rapportController.getVentesRestoParPeriode
);

// ============ RAPPORTS VENTES BOUTIQUE ============

// Rapport ventes boutique journalieres (tous les roles boutique)
router.get(
  '/ventes/boutique/journalieres',
  authorize(ROLES_GROUPS.BOUTIQUE),
  rapportController.getVentesBoutiqueJournalieres
);

// Rapport ventes boutique par periode (tous les roles boutique)
router.get(
  '/ventes/boutique/periode',
  authorize(ROLES_GROUPS.BOUTIQUE),
  rapportController.getVentesBoutiqueParPeriode
);

// ============ RAPPORTS STOCKS ============

// Rapport stock actuel (admin, gerant)
router.get(
  '/stocks/actuel',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  rapportController.getStockActuel
);

// Rapport alertes stock (admin, gerant)
router.get(
  '/stocks/alertes',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  rapportController.getAlertesStock
);

// ============ RAPPORTS BENEFICES ============

// Rapport benefices (admin, gerant)
router.get(
  '/benefices',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  rapportController.getBenefices
);

// ============ RAPPORTS PERFORMANCE ============

// Top vendeurs (admin, gerant)
router.get(
  '/performance/top-vendeurs',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  rapportController.getTopVendeurs
);

// ============ DASHBOARD ============

// Dashboard general (admin, gerant)
router.get(
  '/dashboard',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  rapportController.getDashboard
);

module.exports = router;