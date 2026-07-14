const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const authenticate = require('../middleware/auth');
const { authorize, ROLES, ROLES_GROUPS } = require('../middleware/role');

// ============ ROUTES BOISSONS ============

// Routes protegees avec authentification
router.use(authenticate);

// Creer une boisson (admin, gerant)
router.post(
  '/boissons',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.createBoisson
);

// Lister toutes les boissons (tous les roles)
router.get('/boissons', stockController.getBoissons);

// Recuperer une boisson par ID (tous les roles)
router.get('/boissons/:id', stockController.getBoissonById);

// Mettre a jour une boisson (admin, gerant)
router.put(
  '/boissons/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.updateBoisson
);

// Supprimer une boisson (admin, gerant)
router.delete(
  '/boissons/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.deleteBoisson
);

// Recuperer les alertes boissons (admin, gerant)
router.get(
  '/boissons/alertes',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.getBoissonsAlertes
);

// ============ ROUTES NOURRITURE ============

// Creer un produit alimentaire (admin, gerant)
router.post(
  '/nourriture',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.createNourriture
);

// Lister tous les produits alimentaires (tous les roles)
router.get('/nourriture', stockController.getNourritures);

// Recuperer un produit alimentaire par ID (tous les roles)
router.get('/nourriture/:id', stockController.getNourritureById);

// Mettre a jour un produit alimentaire (admin, gerant)
router.put(
  '/nourriture/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.updateNourriture
);

// Supprimer un produit alimentaire (admin, gerant)
router.delete(
  '/nourriture/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.deleteNourriture
);

// Recuperer les alertes nourriture (admin, gerant)
router.get(
  '/nourriture/alertes',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.getNourritureAlertes
);

// ============ ROUTES BOUTIQUE ============

// Creer un article (admin, gerant)
router.post(
  '/boutique',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.createArticle
);

// Lister tous les articles (tous les roles)
router.get('/boutique', stockController.getArticles);

// Recuperer un article par code-barres (tous les roles)
router.get('/boutique/codebarre/:code_barre', stockController.getArticleByCodeBarre);

// Recuperer un article par ID (tous les roles)
router.get('/boutique/:id', stockController.getArticleById);

// Mettre a jour un article (admin, gerant)
router.put(
  '/boutique/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.updateArticle
);

// Supprimer un article (admin, gerant)
router.delete(
  '/boutique/:id',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.deleteArticle
);

// Recuperer les alertes boutique (admin, gerant)
router.get(
  '/boutique/alertes',
  authorize(ROLES_GROUPS.ADMIN_OR_GERANT),
  stockController.getArticlesAlertes
);

module.exports = router;