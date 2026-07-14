const StockBoisson = require('../models/StockBoisson');
const StockNourriture = require('../models/StockNourriture');
const StockBoutique = require('../models/StockBoutique');
const { ajouterLog } = require('../services/auditService');

const stockController = {
  // ============ BOISSONS ============
  
  async createBoisson(req, res) {
    try {
      const boisson = await StockBoisson.create(req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'stock_boissons',
        enregistrement_id: boisson.id_produit,
        nouvelles_valeurs: boisson,
        details: 'Creation d une nouvelle boisson',
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: boisson,
        message: 'Boisson creee avec succes'
      });
    } catch (error) {
      console.error('Erreur creation boisson:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation de la boisson'
      });
    }
  },

  async getBoissons(req, res) {
    try {
      const { limit, offset, nature, origine } = req.query;
      const boissons = await StockBoisson.findAll({ limit, offset, nature, origine });
      
      res.json({
        success: true,
        data: boissons,
        count: boissons.length
      });
    } catch (error) {
      console.error('Erreur recuperation boissons:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des boissons'
      });
    }
  },

  async getBoissonById(req, res) {
    try {
      const { id } = req.params;
      const boisson = await StockBoisson.findById(id);
      
      if (!boisson) {
        return res.status(404).json({
          success: false,
          error: 'Boisson non trouvee'
        });
      }

      res.json({
        success: true,
        data: boisson
      });
    } catch (error) {
      console.error('Erreur recuperation boisson:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de la boisson'
      });
    }
  },

  async updateBoisson(req, res) {
    try {
      const { id } = req.params;
      
      const ancienneBoisson = await StockBoisson.findById(id);
      if (!ancienneBoisson) {
        return res.status(404).json({
          success: false,
          error: 'Boisson non trouvee'
        });
      }

      const boisson = await StockBoisson.update(id, req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'stock_boissons',
        enregistrement_id: id,
        anciennes_valeurs: ancienneBoisson,
        nouvelles_valeurs: boisson,
        details: 'Mise a jour d une boisson',
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: boisson,
        message: 'Boisson mise a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour boisson:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour de la boisson'
      });
    }
  },

  async deleteBoisson(req, res) {
    try {
      const { id } = req.params;
      
      const boisson = await StockBoisson.findById(id);
      if (!boisson) {
        return res.status(404).json({
          success: false,
          error: 'Boisson non trouvee'
        });
      }

      await StockBoisson.delete(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'stock_boissons',
        enregistrement_id: id,
        anciennes_valeurs: boisson,
        details: 'Suppression d une boisson',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Boisson supprimee avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression boisson:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de la boisson'
      });
    }
  },

  async getBoissonsAlertes(req, res) {
    try {
      const alertes = await StockBoisson.getAlertes();
      
      res.json({
        success: true,
        data: alertes,
        count: alertes.length
      });
    } catch (error) {
      console.error('Erreur recuperation alertes boissons:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des alertes'
      });
    }
  },

  // ============ NOURRITURE ============

  async createNourriture(req, res) {
    try {
      const nourriture = await StockNourriture.create(req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'stock_nourriture',
        enregistrement_id: nourriture.id_produit,
        nouvelles_valeurs: nourriture,
        details: 'Creation d un nouveau produit alimentaire',
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: nourriture,
        message: 'Produit alimentaire cree avec succes'
      });
    } catch (error) {
      console.error('Erreur creation nourriture:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation du produit alimentaire'
      });
    }
  },

  async getNourritures(req, res) {
    try {
      const { limit, offset, emplacement, categorie } = req.query;
      const nourritures = await StockNourriture.findAll({ limit, offset, emplacement, categorie });
      
      res.json({
        success: true,
        data: nourritures,
        count: nourritures.length
      });
    } catch (error) {
      console.error('Erreur recuperation nourritures:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des produits alimentaires'
      });
    }
  },

  async getNourritureById(req, res) {
    try {
      const { id } = req.params;
      const nourriture = await StockNourriture.findById(id);
      
      if (!nourriture) {
        return res.status(404).json({
          success: false,
          error: 'Produit alimentaire non trouve'
        });
      }

      res.json({
        success: true,
        data: nourriture
      });
    } catch (error) {
      console.error('Erreur recuperation nourriture:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation du produit alimentaire'
      });
    }
  },

  async updateNourriture(req, res) {
    try {
      const { id } = req.params;
      
      const ancienneNourriture = await StockNourriture.findById(id);
      if (!ancienneNourriture) {
        return res.status(404).json({
          success: false,
          error: 'Produit alimentaire non trouve'
        });
      }

      const nourriture = await StockNourriture.update(id, req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'stock_nourriture',
        enregistrement_id: id,
        anciennes_valeurs: ancienneNourriture,
        nouvelles_valeurs: nourriture,
        details: 'Mise a jour d un produit alimentaire',
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: nourriture,
        message: 'Produit alimentaire mis a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour nourriture:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour du produit alimentaire'
      });
    }
  },

  async deleteNourriture(req, res) {
    try {
      const { id } = req.params;
      
      const nourriture = await StockNourriture.findById(id);
      if (!nourriture) {
        return res.status(404).json({
          success: false,
          error: 'Produit alimentaire non trouve'
        });
      }

      await StockNourriture.delete(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'stock_nourriture',
        enregistrement_id: id,
        anciennes_valeurs: nourriture,
        details: 'Suppression d un produit alimentaire',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Produit alimentaire supprime avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression nourriture:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression du produit alimentaire'
      });
    }
  },

  async getNourritureAlertes(req, res) {
    try {
      const alertes = await StockNourriture.getAlertes();
      
      res.json({
        success: true,
        data: alertes,
        count: alertes.length
      });
    } catch (error) {
      console.error('Erreur recuperation alertes nourriture:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des alertes'
      });
    }
  },

  // ============ BOUTIQUE ============

  async createArticle(req, res) {
    try {
      const article = await StockBoutique.create(req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'stock_boutique',
        enregistrement_id: article.id_article,
        nouvelles_valeurs: article,
        details: 'Creation d un nouvel article de boutique',
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: article,
        message: 'Article cree avec succes'
      });
    } catch (error) {
      console.error('Erreur creation article:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation de l article'
      });
    }
  },

  async getArticles(req, res) {
    try {
      const { limit, offset, categorie, genre, marque, taille, couleur } = req.query;
      const articles = await StockBoutique.findAll({ 
        limit, offset, categorie, genre, marque, taille, couleur 
      });
      
      res.json({
        success: true,
        data: articles,
        count: articles.length
      });
    } catch (error) {
      console.error('Erreur recuperation articles:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des articles'
      });
    }
  },

  async getArticleById(req, res) {
    try {
      const { id } = req.params;
      const article = await StockBoutique.findById(id);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article non trouve'
        });
      }

      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('Erreur recuperation article:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de l article'
      });
    }
  },

  async getArticleByCodeBarre(req, res) {
    try {
      const { code_barre } = req.params;
      const article = await StockBoutique.findByCodeBarre(code_barre);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article non trouve'
        });
      }

      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('Erreur recuperation article par code barre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de l article'
      });
    }
  },

  async updateArticle(req, res) {
    try {
      const { id } = req.params;
      
      const ancienArticle = await StockBoutique.findById(id);
      if (!ancienArticle) {
        return res.status(404).json({
          success: false,
          error: 'Article non trouve'
        });
      }

      const article = await StockBoutique.update(id, req.body);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'stock_boutique',
        enregistrement_id: id,
        anciennes_valeurs: ancienArticle,
        nouvelles_valeurs: article,
        details: 'Mise a jour d un article de boutique',
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: article,
        message: 'Article mis a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour article:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour de l article'
      });
    }
  },

  async deleteArticle(req, res) {
    try {
      const { id } = req.params;
      
      const article = await StockBoutique.findById(id);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article non trouve'
        });
      }

      await StockBoutique.delete(id);
      
      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'stock_boutique',
        enregistrement_id: id,
        anciennes_valeurs: article,
        details: 'Suppression d un article de boutique',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Article supprime avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression article:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l article'
      });
    }
  },

  async getArticlesAlertes(req, res) {
    try {
      const alertes = await StockBoutique.getAlertes();
      
      res.json({
        success: true,
        data: alertes,
        count: alertes.length
      });
    } catch (error) {
      console.error('Erreur recuperation alertes articles:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des alertes'
      });
    }
  }
};

module.exports = stockController;