const User = require('../models/User');
const MasterCode = require('../models/MasterCode');
const { generateToken } = require('../config/jwt');
const { ajouterLog } = require('../services/auditService');
const bcrypt = require('bcryptjs');

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 30;

const authController = {
  async login(req, res) {
    try {
      const { matricule, mot_de_passe } = req.body;

      if (!matricule || !mot_de_passe) {
        return res.status(400).json({
          success: false,
          error: 'Matricule et mot de passe requis'
        });
      }

      const user = await User.findByMatricule(matricule);
      
      if (!user) {
        await ajouterLog({
          utilisateur_nom: 'Inconnu',
          action: 'LOGIN_FAILED',
          niveau: 'WARNING',
          details: `Tentative de connexion avec matricule: ${matricule}`,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });

        return res.status(401).json({
          success: false,
          error: 'Matricule ou mot de passe incorrect'
        });
      }

      if (user.verrouille_jusqua && new Date(user.verrouille_jusqua) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(user.verrouille_jusqua) - new Date()) / (1000 * 60)
        );
        return res.status(423).json({
          success: false,
          error: `Compte verrouille. Reessayez dans ${remainingMinutes} minutes`,
          verrouille_jusqua: user.verrouille_jusqua
        });
      }

      if (user.statut === 'suspendu') {
        return res.status(403).json({
          success: false,
          error: 'Compte suspendu. Contactez l administrateur'
        });
      }

      if (user.statut === 'archive') {
        return res.status(403).json({
          success: false,
          error: 'Compte archive'
        });
      }

      const isPasswordValid = await User.comparePassword(mot_de_passe, user.mot_de_passe);
      
      if (!isPasswordValid) {
        const attempts = await User.incrementAttempts(matricule);
        
        await ajouterLog({
          utilisateur_id: user.id,
          utilisateur_nom: `${user.nom} ${user.prenom}`,
          action: 'LOGIN_FAILED',
          niveau: 'WARNING',
          details: `Tentative ${attempts.tentative_connexion}/${MAX_ATTEMPTS}`,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });

        if (attempts.tentative_connexion >= MAX_ATTEMPTS) {
          await User.lockAccount(matricule, LOCK_DURATION);
          
          await ajouterLog({
            utilisateur_id: user.id,
            utilisateur_nom: `${user.nom} ${user.prenom}`,
            action: 'ACCOUNT_LOCKED',
            niveau: 'CRITICAL',
            details: `Compte verrouille apres ${MAX_ATTEMPTS} tentatives`,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
          });

          return res.status(423).json({
            success: false,
            error: `Trop de tentatives. Compte verrouille pour ${LOCK_DURATION} minutes`
          });
        }

        return res.status(401).json({
          success: false,
          error: 'Matricule ou mot de passe incorrect',
          attempts: attempts.tentative_connexion,
          maxAttempts: MAX_ATTEMPTS
        });
      }

      await User.updateLastLogin(user.id);

      const token = generateToken(user);

      const userData = {
        id: user.id,
        nom: user.nom,
        postnom: user.postnom,
        prenom: user.prenom,
        matricule: user.matricule,
        numero_telephone: user.numero_telephone,
        role: user.role,
        statut: user.statut,
        photo: user.photo,
        derniere_connexion: new Date().toISOString()
      };

      await ajouterLog({
        utilisateur_id: user.id,
        utilisateur_nom: `${user.nom} ${user.prenom}`,
        action: 'LOGIN_SUCCESS',
        niveau: 'INFO',
        details: 'Connexion reussie',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        token,
        user: userData,
        message: 'Connexion reussie'
      });

    } catch (error) {
      console.error('Erreur login:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la connexion'
      });
    }
  },

  async register(req, res) {
    try {
      const { nom, postnom, prenom, role, password, master_code } = req.body;

      if (!nom || !postnom || !prenom || !role || !password || !master_code) {
        return res.status(400).json({
          success: false,
          error: 'Tous les champs sont requis'
        });
      }

      const isValidMaster = await MasterCode.verify(master_code);
      if (!isValidMaster) {
        return res.status(400).json({
          success: false,
          error: 'Code master invalide'
        });
      }

      const matricule = await User.generateMatricule();

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        nom,
        postnom,
        prenom,
        matricule,
        mot_de_passe: hashedPassword,
        role,
        statut: 'actif',
        photo: ''
      });

      await ajouterLog({
        utilisateur_id: user.id,
        utilisateur_nom: `${user.nom} ${user.prenom}`,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'utilisateurs',
        enregistrement_id: user.id,
        details: 'Nouvel utilisateur inscrit',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        message: 'Inscription reussie',
        user: {
          id: user.id,
          nom: user.nom,
          postnom: user.postnom,
          prenom: user.prenom,
          matricule: user.matricule,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Erreur inscription:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'inscription'
      });
    }
  },

  async logout(req, res) {
    try {
      if (req.user) {
        await ajouterLog({
          utilisateur_id: req.user.id,
          utilisateur_nom: req.user.nom,
          action: 'LOGOUT',
          niveau: 'INFO',
          details: 'Deconnexion',
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      }

      res.json({
        success: true,
        message: 'Deconnexion reussie'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la deconnexion'
      });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouve'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors du chargement du profil'
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

      if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
        return res.status(400).json({
          success: false,
          error: 'Ancien et nouveau mot de passe requis'
        });
      }

      const user = await User.findById(req.user.id);
      const isPasswordValid = await User.comparePassword(
        ancien_mot_de_passe, 
        user.mot_de_passe
      );

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Ancien mot de passe incorrect'
        });
      }

      await User.changePassword(req.user.id, nouveau_mot_de_passe);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'utilisateurs',
        enregistrement_id: req.user.id,
        details: 'Changement de mot de passe',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Mot de passe change avec succes'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erreur lors du changement de mot de passe'
      });
    }
  }
};

module.exports = authController;