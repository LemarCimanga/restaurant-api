const VenteResto = require('../models/VenteResto');
const VenteBoutique = require('../models/VenteBoutique');
const StockBoisson = require('../models/StockBoisson');
const StockNourriture = require('../models/StockNourriture');
const StockBoutique = require('../models/StockBoutique');
const TauxChange = require('../models/TauxChange');
const AuditLog = require('../models/AuditLog');
const pool = require('../config/database');

const rapportController = {
  // ============ RAPPORTS VENTES RESTO ============

  async getVentesRestoJournalieres(req, res) {
    try {
      const { date } = req.query;
      const queryDate = date || 'CURRENT_DATE';
      
      const query = `
        SELECT 
          COUNT(*) as nombre_ventes,
          SUM(montant_total) as total_ventes,
          AVG(montant_total) as panier_moyen,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CASH') as cash,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CARTE') as carte,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'MOBILE_MONEY') as mobile_money
        FROM ventes_resto
        WHERE DATE(prise_commande_at) = ${queryDate}
        AND statut = 'paye'
      `;

      const result = await pool.query(query);
      
      res.json({
        success: true,
        data: result.rows[0],
        periode: date || 'aujourd hui'
      });
    } catch (error) {
      console.error('Erreur rapport ventes resto journalieres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  async getVentesRestoParPeriode(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      
      if (!date_debut || !date_fin) {
        return res.status(400).json({
          success: false,
          error: 'Dates debut et fin requises'
        });
      }

      const query = `
        SELECT 
          DATE(prise_commande_at) as date,
          COUNT(*) as nombre_ventes,
          SUM(montant_total) as total_ventes,
          AVG(montant_total) as panier_moyen
        FROM ventes_resto
        WHERE DATE(prise_commande_at) BETWEEN $1 AND $2
        AND statut = 'paye'
        GROUP BY DATE(prise_commande_at)
        ORDER BY DATE(prise_commande_at) DESC
      `;

      const result = await pool.query(query, [date_debut, date_fin]);
      
      // Calcul des totaux
      const totals = {
        total_ventes: result.rows.reduce((sum, r) => sum + parseFloat(r.total_ventes), 0),
        nombre_ventes: result.rows.reduce((sum, r) => sum + parseInt(r.nombre_ventes), 0),
        panier_moyen: 0
      };
      totals.panier_moyen = totals.nombre_ventes > 0 ? totals.total_ventes / totals.nombre_ventes : 0;

      res.json({
        success: true,
        data: result.rows,
        totals: totals,
        periode: { debut: date_debut, fin: date_fin }
      });
    } catch (error) {
      console.error('Erreur rapport ventes resto par periode:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  // ============ RAPPORTS VENTES BOUTIQUE ============

  async getVentesBoutiqueJournalieres(req, res) {
    try {
      const { date } = req.query;
      const queryDate = date || 'CURRENT_DATE';
      
      const query = `
        SELECT 
          COUNT(*) as nombre_ventes,
          SUM(montant_total) as total_ventes,
          AVG(montant_total) as panier_moyen,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CASH') as cash,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'CARTE') as carte,
          SUM(montant_total) FILTER (WHERE mode_paiement = 'MOBILE_MONEY') as mobile_money
        FROM ventes_boutique
        WHERE DATE(date_heure_vente) = ${queryDate}
        AND statut = 'validee'
      `;

      const result = await pool.query(query);
      
      res.json({
        success: true,
        data: result.rows[0],
        periode: date || 'aujourd hui'
      });
    } catch (error) {
      console.error('Erreur rapport ventes boutique journalieres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  async getVentesBoutiqueParPeriode(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      
      if (!date_debut || !date_fin) {
        return res.status(400).json({
          success: false,
          error: 'Dates debut et fin requises'
        });
      }

      const query = `
        SELECT 
          DATE(date_heure_vente) as date,
          COUNT(*) as nombre_ventes,
          SUM(montant_total) as total_ventes,
          AVG(montant_total) as panier_moyen
        FROM ventes_boutique
        WHERE DATE(date_heure_vente) BETWEEN $1 AND $2
        AND statut = 'validee'
        GROUP BY DATE(date_heure_vente)
        ORDER BY DATE(date_heure_vente) DESC
      `;

      const result = await pool.query(query, [date_debut, date_fin]);
      
      const totals = {
        total_ventes: result.rows.reduce((sum, r) => sum + parseFloat(r.total_ventes), 0),
        nombre_ventes: result.rows.reduce((sum, r) => sum + parseInt(r.nombre_ventes), 0),
        panier_moyen: 0
      };
      totals.panier_moyen = totals.nombre_ventes > 0 ? totals.total_ventes / totals.nombre_ventes : 0;

      res.json({
        success: true,
        data: result.rows,
        totals: totals,
        periode: { debut: date_debut, fin: date_fin }
      });
    } catch (error) {
      console.error('Erreur rapport ventes boutique par periode:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  // ============ RAPPORTS STOCKS ============

  async getStockActuel(req, res) {
    try {
      const boissons = await StockBoisson.findAll({ limit: 999 });
      const nourriture = await StockNourriture.findAll({ limit: 999 });
      const boutique = await StockBoutique.findAll({ limit: 999 });

      // Calcul des valeurs totales
      const totalStock = {
        boissons: boissons.reduce((sum, b) => sum + b.stock_congelateur_unite, 0),
        nourriture: nourriture.reduce((sum, n) => sum + n.stock_unite, 0),
        boutique: boutique.reduce((sum, a) => sum + a.quantite, 0)
      };

      res.json({
        success: true,
        data: {
          boissons,
          nourriture,
          boutique
        },
        totalStock,
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur rapport stock actuel:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  async getAlertesStock(req, res) {
    try {
      const boissons = await StockBoisson.getAlertes();
      const nourriture = await StockNourriture.getAlertes();
      const boutique = await StockBoutique.getAlertes();

      res.json({
        success: true,
        data: {
          boissons,
          nourriture,
          boutique,
          total_alertes: boissons.length + nourriture.length + boutique.length
        }
      });
    } catch (error) {
      console.error('Erreur rapport alertes stock:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  // ============ RAPPORTS BENEFICES ============

  async getBenefices(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      
      // Ventes resto payees
      let queryResto = `
        SELECT 
          SUM(montant_total) as total_ventes,
          SUM(montant_recu) as total_recu
        FROM ventes_resto
        WHERE statut = 'paye'
      `;
      const values = [];

      if (date_debut && date_fin) {
        queryResto += ` AND DATE(prise_commande_at) BETWEEN $1 AND $2`;
        values.push(date_debut, date_fin);
      }

      const restoResult = await pool.query(queryResto, values);

      // Ventes boutique validees
      let queryBoutique = `
        SELECT 
          SUM(montant_total) as total_ventes,
          SUM(montant_recu) as total_recu
        FROM ventes_boutique
        WHERE statut = 'validee'
      `;

      const boutiqueResult = await pool.query(queryBoutique, values);

      const totalVentes = (parseFloat(restoResult.rows[0]?.total_ventes || 0) + 
                          parseFloat(boutiqueResult.rows[0]?.total_ventes || 0));
      const totalRecu = (parseFloat(restoResult.rows[0]?.total_recu || 0) + 
                        parseFloat(boutiqueResult.rows[0]?.total_recu || 0));

      res.json({
        success: true,
        data: {
          restaurant: {
            total_ventes: parseFloat(restoResult.rows[0]?.total_ventes || 0),
            total_recu: parseFloat(restoResult.rows[0]?.total_recu || 0)
          },
          boutique: {
            total_ventes: parseFloat(boutiqueResult.rows[0]?.total_ventes || 0),
            total_recu: parseFloat(boutiqueResult.rows[0]?.total_recu || 0)
          },
          total: {
            total_ventes: totalVentes,
            total_recu: totalRecu
          }
        },
        periode: { debut: date_debut || 'toutes', fin: date_fin || 'toutes' }
      });
    } catch (error) {
      console.error('Erreur rapport benefices:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  // ============ RAPPORTS PERFORMANCE ============

  async getTopVendeurs(req, res) {
    try {
      const { date_debut, date_fin } = req.query;
      
      const query = `
        SELECT 
          vendeur_id,
          vendeur_nom,
          COUNT(*) as nombre_ventes,
          SUM(montant_total) as total_ventes,
          AVG(montant_total) as panier_moyen
        FROM ventes_boutique
        WHERE statut = 'validee'
      `;
      const values = [];
      let paramCount = 1;

      if (date_debut && date_fin) {
        query += ` AND DATE(date_heure_vente) BETWEEN $${paramCount} AND $${paramCount + 1}`;
        values.push(date_debut, date_fin);
        paramCount += 2;
      }

      query += ` GROUP BY vendeur_id, vendeur_nom ORDER BY total_ventes DESC LIMIT 10`;

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows,
        periode: { debut: date_debut || 'toutes', fin: date_fin || 'toutes' }
      });
    } catch (error) {
      console.error('Erreur rapport top vendeurs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du rapport'
      });
    }
  },

  // ============ RAPPORT GENERAL ============

  async getDashboard(req, res) {
    try {
      // Ventes du jour resto
      const restoJour = await pool.query(`
        SELECT 
          COUNT(*) as nombre,
          SUM(montant_total) as total
        FROM ventes_resto
        WHERE DATE(prise_commande_at) = CURRENT_DATE
        AND statut = 'paye'
      `);

      // Ventes du jour boutique
      const boutiqueJour = await pool.query(`
        SELECT 
          COUNT(*) as nombre,
          SUM(montant_total) as total
        FROM ventes_boutique
        WHERE DATE(date_heure_vente) = CURRENT_DATE
        AND statut = 'validee'
      `);

      // Alertes stock
      const alertes = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM stock_boissons WHERE stock_congelateur_unite <= seuil_alerte) as boissons,
          (SELECT COUNT(*) FROM stock_nourriture WHERE stock_unite <= seuil_alerte) as nourriture,
          (SELECT COUNT(*) FROM stock_boutique WHERE quantite <= seuil_alerte) as boutique
      `);

      // Ventes du mois
      const mois = await pool.query(`
        SELECT 
          (SELECT SUM(montant_total) FROM ventes_resto WHERE statut = 'paye' AND DATE_TRUNC('month', prise_commande_at) = DATE_TRUNC('month', CURRENT_DATE)) as resto,
          (SELECT SUM(montant_total) FROM ventes_boutique WHERE statut = 'validee' AND DATE_TRUNC('month', date_heure_vente) = DATE_TRUNC('month', CURRENT_DATE)) as boutique
      `);

      res.json({
        success: true,
        data: {
          aujourd_hui: {
            restaurant: {
              nombre: parseInt(restoJour.rows[0]?.nombre || 0),
              total: parseFloat(restoJour.rows[0]?.total || 0)
            },
            boutique: {
              nombre: parseInt(boutiqueJour.rows[0]?.nombre || 0),
              total: parseFloat(boutiqueJour.rows[0]?.total || 0)
            },
            total: {
              nombre: parseInt(restoJour.rows[0]?.nombre || 0) + parseInt(boutiqueJour.rows[0]?.nombre || 0),
              total: parseFloat(restoJour.rows[0]?.total || 0) + parseFloat(boutiqueJour.rows[0]?.total || 0)
            }
          },
          alertes_stock: {
            boissons: parseInt(alertes.rows[0]?.boissons || 0),
            nourriture: parseInt(alertes.rows[0]?.nourriture || 0),
            boutique: parseInt(alertes.rows[0]?.boutique || 0)
          },
          ventes_mois: {
            restaurant: parseFloat(mois.rows[0]?.resto || 0),
            boutique: parseFloat(mois.rows[0]?.boutique || 0),
            total: parseFloat(mois.rows[0]?.resto || 0) + parseFloat(mois.rows[0]?.boutique || 0)
          }
        },
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur generation dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la generation du dashboard'
      });
    }
  }
};

module.exports = rapportController;