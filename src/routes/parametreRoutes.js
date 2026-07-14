const express = require('express');
const router = express.Router();
const parametreController = require('../controllers/parametreController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES, ROLES_GROUPS } = require('../middleware/role');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// ============ TAUX DE CHANGE ============

// Creer un taux de change (admin, gerant)
router.post(
  '/taux',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.createTaux
);

// Recuperer tous les taux actifs (tous les roles)
router.get('/taux', parametreController.getTaux);

// Recuperer un taux par devise (tous les roles)
router.get('/taux/:devise', parametreController.getTauxByDevise);

// Mettre a jour un taux (admin, gerant)
router.put(
  '/taux/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.updateTaux
);

// Historique des taux (admin, gerant)
router.get(
  '/taux/historique',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.getHistoriqueTaux
);

// ============ MOBILE MONEY ============

// Creer un parametre Mobile Money (admin)
router.post(
  '/mobile-money',
  authorize([ROLES.ADMIN]),
  parametreController.createMobileMoney
);

// Recuperer les parametres Mobile Money (tous les roles)
router.get('/mobile-money', parametreController.getMobileMoney);

// Mettre a jour un parametre Mobile Money (admin)
router.put(
  '/mobile-money/:id',
  authorize([ROLES.ADMIN]),
  parametreController.updateMobileMoney
);

// ============ PRIX PAR EMPLACEMENT ============

// Creer un prix par emplacement (admin, gerant)
router.post(
  '/prix-emplacement',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.createPrixEmplacement
);

// Recuperer les prix par emplacement (tous les roles)
router.get('/prix-emplacement', parametreController.getPrixEmplacements);

// Mettre a jour un prix par emplacement (admin, gerant)
router.put(
  '/prix-emplacement/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.updatePrixEmplacement
);

// Supprimer un prix par emplacement (admin, gerant)
router.delete(
  '/prix-emplacement/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  parametreController.deletePrixEmplacement
);

module.exports = router;