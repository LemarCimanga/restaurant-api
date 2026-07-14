const express = require('express');
const router = express.Router();
const venteBoutiqueController = require('../controllers/venteBoutiqueController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES, ROLES_GROUPS } = require('../middleware/role');

// Toutes les routes necessitent une authentification
router.use(authenticate);

// ============ ROUTES VENTES BOUTIQUE ============

// Creer une vente (agent boutique, admin, gerant)
router.post(
  '/',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.createVente
);

// Lister toutes les ventes (tous les roles boutique)
router.get(
  '/',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.getVentes
);

// Recuperer une vente par ID (tous les roles boutique)
router.get(
  '/:id',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.getVenteById
);

// Mettre a jour une vente (admin, gerant)
router.put(
  '/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  venteBoutiqueController.updateVente
);

// Annuler une vente (agent boutique, admin, gerant)
router.patch(
  '/:id/annuler',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.annulerVente
);

// Marquer WhatsApp comme envoye (agent boutique, admin, gerant)
router.patch(
  '/:id/whatsapp',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.marquerWhatsappEnvoye
);

// Recuperer les ventes du jour (tous les roles boutique)
router.get(
  '/stats/journalieres',
  authorize(ROLES_GROUPS.BOUTIQUE),
  venteBoutiqueController.getVentesDuJour
);

// Recuperer les statistiques par vendeur (admin, gerant)
router.get(
  '/stats/vendeur',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  venteBoutiqueController.getStatsParVendeur
);

// Supprimer une vente (admin seulement)
router.delete(
  '/:id',
  authorize([ROLES.ADMIN]),
  venteBoutiqueController.deleteVente
);

module.exports = router;