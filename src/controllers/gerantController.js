// src/controllers/gerantController.js
const pool = require('../config/database');
const { ajouterLog } = require('../services/auditService');

const gerantController = {
  // ============================================================
  // DASHBOARD
  // ============================================================
  
  async getDashboard(req, res) {
    try {
      // Ventes du jour
      const ventesJour = await pool.query(`
        SELECT 
          COALESCE(SUM(montant_total), 0) as total_ventes,
          COUNT(*) as nombre_transactions
        FROM ventes_resto 
        WHERE DATE(prise_commande_at) = CURRENT_DATE AND statut = 'paye'
      `);

      const boutiqueJour = await pool.query(`
        SELECT 
          COALESCE(SUM(montant_total), 0) as total_ventes,
          COUNT(*) as nombre_transactions
        FROM ventes_boutique 
        WHERE DATE(date_heure_vente) = CURRENT_DATE AND statut = 'validee'
      `);

      // Alertes stock
      const alertes = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM stock_boissons WHERE stock_congelateur_unite <= seuil_alerte) as boissons,
          (SELECT COUNT(*) FROM stock_nourriture WHERE stock_unite <= seuil_alerte) as nourriture,
          (SELECT COUNT(*) FROM stock_boutique WHERE quantite <= seuil_alerte) as boutique
      `);

      // Agents actifs
      const agents = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN statut = 'actif' THEN 1 END) as actifs,
               COUNT(CASE WHEN statut = 'suspendu' THEN 1 END) as suspendus
        FROM utilisateurs 
        WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto')
      `);

      res.json({
        success: true,
        data: {
          ventes_jour: {
            restaurant: parseFloat(ventesJour.rows[0]?.total_ventes || 0),
            boutique: parseFloat(boutiqueJour.rows[0]?.total_ventes || 0),
            total: parseFloat(ventesJour.rows[0]?.total_ventes || 0) + 
                   parseFloat(boutiqueJour.rows[0]?.total_ventes || 0)
          },
          transactions: {
            restaurant: parseInt(ventesJour.rows[0]?.nombre_transactions || 0),
            boutique: parseInt(boutiqueJour.rows[0]?.nombre_transactions || 0)
          },
          alertes_stock: {
            boissons: parseInt(alertes.rows[0]?.boissons || 0),
            nourriture: parseInt(alertes.rows[0]?.nourriture || 0),
            boutique: parseInt(alertes.rows[0]?.boutique || 0)
          },
          agents: {
            total: parseInt(agents.rows[0]?.total || 0),
            actifs: parseInt(agents.rows[0]?.actifs || 0),
            suspendus: parseInt(agents.rows[0]?.suspendus || 0)
          }
        }
      });
    } catch (error) {
      console.error('Erreur dashboard:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du dashboard' });
    }
  },

  async getKPI(req, res) {
    try {
      // Chiffre d'affaires du mois
      const caMois = await pool.query(`
        SELECT 
          SUM(montant_total) as ca,
          DATE_TRUNC('month', prise_commande_at) as mois
        FROM ventes_resto 
        WHERE statut = 'paye' 
        AND DATE_TRUNC('month', prise_commande_at) = DATE_TRUNC('month', CURRENT_DATE)
        UNION ALL
        SELECT 
          SUM(montant_total) as ca,
          DATE_TRUNC('month', date_heure_vente) as mois
        FROM ventes_boutique 
        WHERE statut = 'validee' 
        AND DATE_TRUNC('month', date_heure_vente) = DATE_TRUNC('month', CURRENT_DATE)
      `);

      // Panier moyen
      const panierMoyen = await pool.query(`
        SELECT AVG(montant_total) as moyen
        FROM (
          SELECT montant_total FROM ventes_resto WHERE statut = 'paye'
          UNION ALL
          SELECT montant_total FROM ventes_boutique WHERE statut = 'validee'
        ) as toutes_ventes
      `);

      res.json({
        success: true,
        data: {
          ca_mois: parseFloat(caMois.rows[0]?.ca || 0),
          panier_moyen: parseFloat(panierMoyen.rows[0]?.moyen || 0),
          nombre_commandes: await getNombreCommandes(),
          nombre_ventes_boutique: await getNombreVentesBoutique()
        }
      });
    } catch (error) {
      console.error('Erreur KPI:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des KPI' });
    }
  },

  async getAlertes(req, res) {
    try {
      // Produits en alerte
      const boissons = await pool.query(`
        SELECT id_produit as id, designation, 'boisson' as type, 
               stock_congelateur_unite as stock, seuil_alerte
        FROM stock_boissons 
        WHERE stock_congelateur_unite <= seuil_alerte
      `);

      const nourriture = await pool.query(`
        SELECT id_produit as id, designation, 'nourriture' as type,
               stock_unite as stock, seuil_alerte
        FROM stock_nourriture 
        WHERE stock_unite <= seuil_alerte
      `);

      const boutique = await pool.query(`
        SELECT id_article as id, designation, 'boutique' as type,
               quantite as stock, seuil_alerte
        FROM stock_boutique 
        WHERE quantite <= seuil_alerte
      `);

      // Tickets en attente cuisine
      const ticketsCuisine = await pool.query(`
        SELECT COUNT(*) as en_attente
        FROM ventes_resto 
        WHERE statut = 'en_attente'
        AND id IN (SELECT DISTINCT vente_id FROM details_ventes_resto WHERE plat_id IS NOT NULL)
      `);

      res.json({
        success: true,
        data: {
          produits: [...boissons.rows, ...nourriture.rows, ...boutique.rows],
          tickets_cuisine_en_attente: parseInt(ticketsCuisine.rows[0]?.en_attente || 0)
        }
      });
    } catch (error) {
      console.error('Erreur alertes:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des alertes' });
    }
  },

  async getTopProduits(req, res) {
    try {
      // Top produits restaurant
      const topResto = await pool.query(`
        SELECT 
          produit_nom,
          SUM(quantite) as total_vendu,
          SUM(quantite * prix_vente_unite) as chiffre_affaires
        FROM details_ventes_resto d
        JOIN ventes_resto v ON d.vente_id = v.id_facture_rst
        WHERE v.statut = 'paye'
        AND DATE(v.prise_commande_at) >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY produit_nom
        ORDER BY total_vendu DESC
        LIMIT 10
      `);

      // Top produits boutique
      const topBoutique = await pool.query(`
        SELECT 
          sb.designation as produit_nom,
          SUM(vba.quantite) as total_vendu,
          SUM(vba.quantite * vba.prix_unitaire) as chiffre_affaires
        FROM ventes_boutique_articles vba
        JOIN stock_boutique sb ON vba.article_id = sb.id_article
        JOIN ventes_boutique vb ON vba.vente_id = vb.id_vente_bqt
        WHERE vb.statut = 'validee'
        AND DATE(vb.date_heure_vente) >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY sb.designation
        ORDER BY total_vendu DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          restaurant: topResto.rows,
          boutique: topBoutique.rows
        }
      });
    } catch (error) {
      console.error('Erreur top produits:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des top produits' });
    }
  },

  // ============================================================
  // GESTION DES STOCKS (Gérant)
  // ============================================================

  async getStocks(req, res) {
    try {
      const boissons = await pool.query(`
        SELECT id_produit as id, designation, nature, origine,
               stock_general_casier, stock_general_unite, stock_congelateur_unite,
               seuil_alerte, prix_vente_detail, 'boisson' as type
        FROM stock_boissons
      `);

      const nourriture = await pool.query(`
        SELECT id_produit as id, designation, categorie, emplacement,
               stock_unite, seuil_alerte, prix_vente_unite, 'nourriture' as type
        FROM stock_nourriture
      `);

      const boutique = await pool.query(`
        SELECT id_article as id, designation, categorie, genre,
               quantite, seuil_alerte, prix_vente, 'boutique' as type
        FROM stock_boutique
      `);

      res.json({
        success: true,
        data: {
          boissons: boissons.rows,
          nourriture: nourriture.rows,
          boutique: boutique.rows
        }
      });
    } catch (error) {
      console.error('Erreur stocks:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des stocks' });
    }
  },

  async transfererStock(req, res) {
    try {
      const { produit_id, type, source, destination, quantite } = req.body;

      // Logique de transfert selon le type de produit
      if (type === 'boisson') {
        if (source === 'general' && destination === 'congelateur') {
          await pool.query(`
            UPDATE stock_boissons 
            SET stock_general_unite = stock_general_unite - $1,
                stock_congelateur_unite = stock_congelateur_unite + $1
            WHERE id_produit = $2
          `, [quantite, produit_id]);
        } else if (source === 'casier' && destination === 'general') {
          await pool.query(`
            UPDATE stock_boissons 
            SET stock_general_casier = stock_general_casier - $1,
                stock_general_unite = stock_general_unite + ($1 * taux_conversion)
            WHERE id_produit = $2
          `, [quantite, produit_id]);
        }
      } else if (type === 'nourriture') {
        // Transfert entre emplacements
        await pool.query(`
          UPDATE stock_nourriture 
          SET emplacement = $1
          WHERE id_produit = $2
        `, [destination, produit_id]);
      }

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'TRANSFERT_STOCK',
        niveau: 'INFO',
        details: `Transfert stock: ${type} ${produit_id} de ${source} vers ${destination}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Transfert effectué avec succès'
      });
    } catch (error) {
      console.error('Erreur transfert stock:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du transfert' });
    }
  },

  async modifierSeuil(req, res) {
    try {
      const { produit_id, type, seuil } = req.body;

      let query = '';
      if (type === 'boisson') {
        query = `UPDATE stock_boissons SET seuil_alerte = $1 WHERE id_produit = $2`;
      } else if (type === 'nourriture') {
        query = `UPDATE stock_nourriture SET seuil_alerte = $1 WHERE id_produit = $2`;
      } else if (type === 'boutique') {
        query = `UPDATE stock_boutique SET seuil_alerte = $1 WHERE id_article = $2`;
      }

      await pool.query(query, [seuil, produit_id]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        details: `Modification seuil alerte: ${type} ${produit_id} -> ${seuil}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Seuil modifié avec succès'
      });
    } catch (error) {
      console.error('Erreur modification seuil:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la modification du seuil' });
    }
  },

  // ============================================================
  // GESTION DES AGENTS
  // ============================================================

  async getAgents(req, res) {
    try {
      const result = await pool.query(`
        SELECT id, nom, postnom, prenom, matricule, numero_telephone,
               role, statut, photo, derniere_connexion, created_at
        FROM utilisateurs 
        WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto')
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erreur agents:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des agents' });
    }
  },

  async bloquerAgent(req, res) {
    try {
      const { id } = req.params;
      
      await pool.query(
        `UPDATE utilisateurs SET statut = 'suspendu' WHERE id = $1`,
        [id]
      );

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'WARNING',
        details: `Agent ${id} bloqué`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Agent bloqué avec succès'
      });
    } catch (error) {
      console.error('Erreur blocage agent:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du blocage de l\'agent' });
    }
  },

  async debloquerAgent(req, res) {
    try {
      const { id } = req.params;
      
      await pool.query(
        `UPDATE utilisateurs SET statut = 'actif' WHERE id = $1`,
        [id]
      );

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'UPDATE',
        niveau: 'INFO',
        details: `Agent ${id} débloqué`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Agent débloqué avec succès'
      });
    } catch (error) {
      console.error('Erreur déblocage agent:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du déblocage de l\'agent' });
    }
  },

  // ============================================================
  // DÉPENSES
  // ============================================================

  async getDepenses(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      
      let query = `SELECT * FROM depenses WHERE 1=1`;
      const values = [];
      let paramCount = 1;

      if (date_debut) {
        query += ` AND date_depense >= $${paramCount}`;
        values.push(date_debut);
        paramCount++;
      }

      if (date_fin) {
        query += ` AND date_depense <= $${paramCount}`;
        values.push(date_fin);
        paramCount++;
      }

      query += ` ORDER BY date_depense DESC, created_at DESC`;
      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erreur dépenses:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement des dépenses' });
    }
  },

  async createDepense(req, res) {
    try {
      const { description, montant, categorie, mode_paiement, reference } = req.body;

      const result = await pool.query(`
        INSERT INTO depenses (description, montant, categorie, mode_paiement, reference, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [description, montant, categorie, mode_paiement, reference, req.user.id]);

      await ajouterLog({
        utilisateur_id: req.user.id,
        utilisateur_nom: req.user.nom,
        action: 'INSERT',
        niveau: 'INFO',
        table_concernee: 'depenses',
        enregistrement_id: result.rows[0].id,
        details: `Nouvelle dépense: ${description} - ${montant}`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Dépense enregistrée avec succès'
      });
    } catch (error) {
      console.error('Erreur création dépense:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la création de la dépense' });
    }
  },

  async getResumeDepenses(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          SUM(montant) as total,
          SUM(CASE WHEN DATE(date_depense) = CURRENT_DATE THEN montant ELSE 0 END) as aujourd_hui,
          SUM(CASE WHEN DATE_TRUNC('month', date_depense) = DATE_TRUNC('month', CURRENT_DATE) THEN montant ELSE 0 END) as ce_mois
        FROM depenses
      `);

      const parCategorie = await pool.query(`
        SELECT categorie, SUM(montant) as total
        FROM depenses
        WHERE DATE_TRUNC('month', date_depense) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY categorie
        ORDER BY total DESC
      `);

      res.json({
        success: true,
        data: {
          total: parseFloat(result.rows[0]?.total || 0),
          aujourd_hui: parseFloat(result.rows[0]?.aujourd_hui || 0),
          ce_mois: parseFloat(result.rows[0]?.ce_mois || 0),
          par_categorie: parCategorie.rows
        }
      });
    } catch (error) {
      console.error('Erreur résumé dépenses:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du résumé' });
    }
  },

  // ============================================================
  // RAPPORTS
  // ============================================================

  async getRapportJournalier(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || 'CURRENT_DATE';

      // Ventes restaurant
      const ventesResto = await pool.query(`
        SELECT 
          COUNT(*) as nombre,
          SUM(montant_total) as total,
          AVG(montant_total) as moyen,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CASH') as cash,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CARTE') as carte,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'MOBILE_MONEY') as mobile
        FROM ventes_resto
        WHERE DATE(prise_commande_at) = ${targetDate}
        AND statut = 'paye'
      `);

      // Ventes boutique
      const ventesBoutique = await pool.query(`
        SELECT 
          COUNT(*) as nombre,
          SUM(montant_total) as total,
          AVG(montant_total) as moyen
        FROM ventes_boutique
        WHERE DATE(date_heure_vente) = ${targetDate}
        AND statut = 'validee'
      `);

      res.json({
        success: true,
        data: {
          date: date || new Date().toISOString().split('T')[0],
          restaurant: ventesResto.rows[0],
          boutique: ventesBoutique.rows[0],
          total: {
            nombre: parseInt(ventesResto.rows[0]?.nombre || 0) + 
                   parseInt(ventesBoutique.rows[0]?.nombre || 0),
            total: parseFloat(ventesResto.rows[0]?.total || 0) + 
                   parseFloat(ventesBoutique.rows[0]?.total || 0)
          }
        }
      });
    } catch (error) {
      console.error('Erreur rapport journalier:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement du rapport' });
    }
  },

  async getRapportEvolution(req, res) {
    try {
      const { periode = '30' } = req.query;

      const evolution = await pool.query(`
        WITH jours AS (
          SELECT generate_series(
            CURRENT_DATE - ($1 || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
          )::DATE as jour
        )
        SELECT 
          j.jour,
          COALESCE(r.total, 0) as restaurant,
          COALESCE(b.total, 0) as boutique,
          COALESCE(r.total, 0) + COALESCE(b.total, 0) as total
        FROM jours j
        LEFT JOIN (
          SELECT DATE(prise_commande_at) as date, SUM(montant_total) as total
          FROM ventes_resto
          WHERE statut = 'paye'
          GROUP BY DATE(prise_commande_at)
        ) r ON j.jour = r.date
        LEFT JOIN (
          SELECT DATE(date_heure_vente) as date, SUM(montant_total) as total
          FROM ventes_boutique
          WHERE statut = 'validee'
          GROUP BY DATE(date_heure_vente)
        ) b ON j.jour = b.date
        ORDER BY j.jour ASC
      `, [periode]);

      res.json({
        success: true,
        data: evolution.rows
      });
    } catch (error) {
      console.error('Erreur évolution:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement de l\'évolution' });
    }
  },

  // ============================================================
  // AUDIT
  // ============================================================

  async getAudit(req, res) {
    try {
      const { limit = 50, offset = 0, niveau, action } = req.query;
      
      let query = `SELECT * FROM audit_log WHERE 1=1`;
      const values = [];
      let paramCount = 1;

      if (niveau) {
        query += ` AND niveau = $${paramCount}`;
        values.push(niveau);
        paramCount++;
      }

      if (action) {
        query += ` AND action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }

      query += ` ORDER BY date_heure_action DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Erreur audit:', error);
      res.status(500).json({ success: false, error: 'Erreur lors du chargement de l\'audit' });
    }
  }
};

// Fonctions auxiliaires
async function getNombreCommandes() {
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM ventes_resto 
    WHERE statut = 'paye' 
    AND DATE_TRUNC('month', prise_commande_at) = DATE_TRUNC('month', CURRENT_DATE)
  `);
  return parseInt(result.rows[0]?.count || 0);
}

async function getNombreVentesBoutique() {
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM ventes_boutique 
    WHERE statut = 'validee' 
    AND DATE_TRUNC('month', date_heure_vente) = DATE_TRUNC('month', CURRENT_DATE)
  `);
  return parseInt(result.rows[0]?.count || 0);
}

module.exports = gerantController;