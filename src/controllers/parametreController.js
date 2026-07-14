const TauxChange = require('../models/TauxChange');
const pool = require('../config/database');
const { ajouterLog } = require('../services/auditService');

const parametreController = {
  // ============ TAUX DE CHANGE ============

  async createTaux(req, res) {
    try {
      const { devise, taux, symbole, date_debut } = req.body;

      // Verifier si un taux existe deja pour cette devise
      const existant = await TauxChange.findCurrentByDevise(devise);
      if (existant) {
        return res.status(400).json({
          success: false,
          error: `Un taux pour ${devise} existe deja. Utilisez la mise a jour.`
        });
      }

      const tauxChange = await TauxChange.create({
        devise,
        taux,
        symbole,
        date_debut: date_debut || new Date().toISOString().split('T')[0],
        modifie_par: req.user.id
      });

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'Taux change',
        niveau: 'INFO',
        table_concernee: 'taux_change',
        enregistrement_id: tauxChange.id,
        nouvelles_valeurs: tauxChange,
        details: `Creation du taux ${devise}: ${taux}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: tauxChange,
        message: 'Taux de change cree avec succes'
      });
    } catch (error) {
      console.error('Erreur creation taux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation du taux de change'
      });
    }
  },

  async getTaux(req, res) {
    try {
      const taux = await TauxChange.getAllCurrent();
      
      res.json({
        success: true,
        data: taux
      });
    } catch (error) {
      console.error('Erreur recuperation taux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des taux de change'
      });
    }
  },

  async getTauxByDevise(req, res) {
    try {
      const { devise } = req.params;
      const taux = await TauxChange.findCurrentByDevise(devise);
      
      if (!taux) {
        return res.status(404).json({
          success: false,
          error: `Taux de change pour ${devise} non trouve`
        });
      }

      res.json({
        success: true,
        data: taux
      });
    } catch (error) {
      console.error('Erreur recuperation taux par devise:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation du taux de change'
      });
    }
  },

  async updateTaux(req, res) {
    try {
      const { id } = req.params;
      const { taux } = req.body;

      if (!taux || taux <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Taux valide requis'
        });
      }

      const ancienTaux = await TauxChange.findById(id);
      if (!ancienTaux) {
        return res.status(404).json({
          success: false,
          error: 'Taux de change non trouve'
        });
      }

      const nouveauTaux = await TauxChange.updateCurrent(id, taux, req.user.id);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'Taux change',
        niveau: 'INFO',
        table_concernee: 'taux_change',
        enregistrement_id: id,
        anciennes_valeurs: { taux: ancienTaux.taux },
        nouvelles_valeurs: { taux: taux },
        details: `Mise a jour du taux ${ancienTaux.devise}: ${ancienTaux.taux} -> ${taux}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: nouveauTaux,
        message: 'Taux de change mis a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour taux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour du taux de change'
      });
    }
  },

  async getHistoriqueTaux(req, res) {
    try {
      const { devise, limit = 50 } = req.query;
      
      let query = `
        SELECT * FROM taux_change 
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (devise) {
        query += ` AND devise = $${paramCount}`;
        values.push(devise);
        paramCount++;
      }

      query += ` ORDER BY date_debut DESC LIMIT $${paramCount}`;
      values.push(limit);

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erreur recuperation historique taux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation de l historique'
      });
    }
  },

  // ============ PARAMETRES MOBILE MONEY ============

  async createMobileMoney(req, res) {
    try {
      const { reseau, numero_commercant, frais_par_defaut } = req.body;

      const query = `
        INSERT INTO parametres_mobile_money (
          reseau, numero_commercant, frais_par_defaut, modifie_par
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await pool.query(query, [
        reseau, numero_commercant, frais_par_defaut || 0, req.user.id
      ]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'parametres_mobile_money',
        enregistrement_id: result.rows[0].id,
        nouvelles_valeurs: result.rows[0],
        details: `Creation parametre Mobile Money pour ${reseau}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Parametre Mobile Money cree avec succes'
      });
    } catch (error) {
      console.error('Erreur creation mobile money:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation du parametre Mobile Money'
      });
    }
  },

  async getMobileMoney(req, res) {
    try {
      const query = `
        SELECT * FROM parametres_mobile_money 
        WHERE est_actif = true
        ORDER BY reseau ASC
      `;
      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erreur recuperation mobile money:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des parametres Mobile Money'
      });
    }
  },

  async updateMobileMoney(req, res) {
    try {
      const { id } = req.params;
      const { numero_commercant, frais_par_defaut, est_actif } = req.body;

      const ancien = await pool.query(
        `SELECT * FROM parametres_mobile_money WHERE id = $1`,
        [id]
      );

      if (!ancien.rows[0]) {
        return res.status(404).json({
          success: false,
          error: 'Parametre Mobile Money non trouve'
        });
      }

      const query = `
        UPDATE parametres_mobile_money SET
          numero_commercant = COALESCE($1, numero_commercant),
          frais_par_defaut = COALESCE($2, frais_par_defaut),
          est_actif = COALESCE($3, est_actif),
          modifie_par = $4
        WHERE id = $5
        RETURNING *
      `;

      const result = await pool.query(query, [
        numero_commercant, frais_par_defaut, est_actif, req.user.id, id
      ]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'parametres_mobile_money',
        enregistrement_id: id,
        anciennes_valeurs: ancien.rows[0],
        nouvelles_valeurs: result.rows[0],
        details: `Mise a jour parametre Mobile Money`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Parametre Mobile Money mis a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour mobile money:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour du parametre Mobile Money'
      });
    }
  },

  // ============ PRIX PAR EMPLACEMENT ============

  async createPrixEmplacement(req, res) {
    try {
      const { produit_id, emplacement_id, prix_vente } = req.body;

      const query = `
        INSERT INTO prix_boissons_emplacement (
          produit_id, emplacement_id, prix_vente
        ) VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await pool.query(query, [produit_id, emplacement_id, prix_vente]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'prix_boissons_emplacement',
        enregistrement_id: result.rows[0].id,
        nouvelles_valeurs: result.rows[0],
        details: `Creation prix emplacement pour produit ${produit_id}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Prix par emplacement cree avec succes'
      });
    } catch (error) {
      console.error('Erreur creation prix emplacement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la creation du prix par emplacement'
      });
    }
  },

  async getPrixEmplacements(req, res) {
    try {
      const { produit_id } = req.query;
      
      let query = `
        SELECT p.*, e.nom as emplacement_nom, b.designation as produit_nom
        FROM prix_boissons_emplacement p
        JOIN emplacements e ON p.emplacement_id = e.id
        JOIN stock_boissons b ON p.produit_id = b.id_produit
        WHERE 1=1
      `;
      const values = [];

      if (produit_id) {
        query += ` AND p.produit_id = $1`;
        values.push(produit_id);
      }

      query += ` ORDER BY e.ordre_affichage ASC`;

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erreur recuperation prix emplacements:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recuperation des prix par emplacement'
      });
    }
  },

  async updatePrixEmplacement(req, res) {
    try {
      const { id } = req.params;
      const { prix_vente } = req.body;

      const ancien = await pool.query(
        `SELECT * FROM prix_boissons_emplacement WHERE id = $1`,
        [id]
      );

      if (!ancien.rows[0]) {
        return res.status(404).json({
          success: false,
          error: 'Prix par emplacement non trouve'
        });
      }

      const query = `
        UPDATE prix_boissons_emplacement SET
          prix_vente = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [prix_vente, id]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        table_concernee: 'prix_boissons_emplacement',
        enregistrement_id: id,
        anciennes_valeurs: { prix_vente: ancien.rows[0].prix_vente },
        nouvelles_valeurs: { prix_vente: prix_vente },
        details: `Mise a jour prix emplacement`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Prix par emplacement mis a jour avec succes'
      });
    } catch (error) {
      console.error('Erreur mise a jour prix emplacement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise a jour du prix par emplacement'
      });
    }
  },

  async deletePrixEmplacement(req, res) {
    try {
      const { id } = req.params;

      const ancien = await pool.query(
        `SELECT * FROM prix_boissons_emplacement WHERE id = $1`,
        [id]
      );

      if (!ancien.rows[0]) {
        return res.status(404).json({
          success: false,
          error: 'Prix par emplacement non trouve'
        });
      }

      await pool.query(`DELETE FROM prix_boissons_emplacement WHERE id = $1`, [id]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'DELETE',
        niveau: 'WARNING',
        table_concernee: 'prix_boissons_emplacement',
        enregistrement_id: id,
        anciennes_valeurs: ancien.rows[0],
        details: 'Suppression prix par emplacement',
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Prix par emplacement supprime avec succes'
      });
    } catch (error) {
      console.error('Erreur suppression prix emplacement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression du prix par emplacement'
      });
    }
  }
};

module.exports = parametreController;