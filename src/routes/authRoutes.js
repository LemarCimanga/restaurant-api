const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// ============================================================
// ROUTES PUBLIQUES (sans authentification)
// ============================================================

// Connexion
router.post('/login', authController.login);

// Inscription
router.post('/register', authController.register);

// Vérification du code master
router.post('/verify-master-code', authController.verifyMasterCode);

// ============================================================
// ROUTES PROTÉGÉES (avec authentification)
// ============================================================

// Profil utilisateur
router.get('/me', authenticate, authController.getProfile);

// Déconnexion
router.post('/logout', authenticate, authController.logout);

// Changer le mot de passe
router.post('/change-password', authenticate, authController.changePassword);

// Mettre à jour la photo de profil
router.post('/update-photo', authenticate, authController.updatePhoto);

// Mettre à jour le profil (nom, postnom, prenom, téléphone)
router.put('/profile', authenticate, authController.updateProfile);

// Supprimer le compte (désactivation)
router.delete('/account', authenticate, authController.deleteAccount);

// Rafraîchir le token JWT
router.post('/refresh-token', authenticate, authController.refreshToken);

// Vérifier si le token est valide
router.get('/verify-token', authenticate, authController.verifyToken);

module.exports = router;