const express = require('express');
const router = express.Router();
const platController = require('../controllers/platController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES_GROUPS } = require('../middleware/role');

// Toutes les routes nécessitent authentification
router.use(authenticate);

// ============ ROUTES PLATS ============

// Créer un plat (admin, gerant)
router.post(
  '/',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  platController.create
);

// Lister tous les plats (tous les roles)
router.get('/', platController.findAll);

// Récupérer un plat par ID (tous les roles)
router.get('/:id', platController.findById);

// Mettre à jour un plat (admin, gerant)
router.put(
  '/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  platController.update
);

// Supprimer un plat (admin, gerant)
router.delete(
  '/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  platController.delete
);

// ============ ROUTES CUISINE ============

// Voir les commandes en cuisine (agent cuisine, admin, gerant)
router.get(
  '/cuisine/commandes',
  authorize(['agent cuisine', ...ROLES_GROUPS.ADMIN_OR_GERANT]),
  platController.getCommandesCuisine
);

// Démarrer la préparation d'une commande (agent cuisine)
router.patch(
  '/cuisine/:vente_id/demarrer',
  authorize(['agent cuisine']),
  platController.demarrerPreparation
);

// Terminer la préparation d'une commande (agent cuisine)
router.patch(
  '/cuisine/:vente_id/terminer',
  authorize(['agent cuisine']),
  platController.terminerPreparation
);

module.exports = router;