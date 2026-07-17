const pool = require('../config/database');

class VenteResto {
  static async create(data) {
    const {
      serveur_id, serveur_nom, caissier_id, caissier_nom,
      nom_client, numero_table, type_service,
      montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      emplacement_id
    } = data;

    const query = `
      INSERT INTO ventes_resto (
        serveur_id, serveur_nom, caissier_id, caissier_nom,
        nom_client, numero_table, type_service,
        montant_total, montant_recu, montant_rendu,
        mode_paiement, devise_paiement, taux_change_id,
        emplacement_id, statut, prise_commande_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'en_attente', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      serveur_id, serveur_nom, caissier_id || null, caissier_nom || null,
      nom_client || 'Anonyme', numero_table, type_service || 'sur_place',
      montant_total || 0, montant_recu || 0, montant_rendu || 0,
      mode_paiement, devise_paiement || 'FC', taux_change_id || null,
      emplacement_id || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT v.*, 
             COALESCE(u.nom, '') as serveur_nom_complet,
             (SELECT COUNT(*) FROM details_ventes_resto WHERE vente_id = v.id_facture_rst) as nombre_articles
      FROM ventes_resto v
      LEFT JOIN utilisateurs u ON v.serveur_id = u.id
      WHERE v.id_facture_rst = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, statut, serveur_id, date_debut, date_fin } = options;
    
    let query = `SELECT * FROM ventes_resto WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (statut) {
      query += ` AND statut = $${paramCount}`;
      values.push(statut);
      paramCount++;
    }

    if (serveur_id) {
      query += ` AND serveur_id = $${paramCount}`;
      values.push(serveur_id);
      paramCount++;
    }

    if (date_debut) {
      query += ` AND prise_commande_at >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND prise_commande_at <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    query += ` ORDER BY prise_commande_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      serveur_id, serveur_nom, caissier_id, caissier_nom,
      nom_client, numero_table, type_service,
      statut, montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      emplacement_id
    } = data;

    const query = `
      UPDATE ventes_resto SET
        serveur_id = COALESCE($1, serveur_id),
        serveur_nom = COALESCE($2, serveur_nom),
        caissier_id = COALESCE($3, caissier_id),
        caissier_nom = COALESCE($4, caissier_nom),
        nom_client = COALESCE($5, nom_client),
        numero_table = COALESCE($6, numero_table),
        type_service = COALESCE($7, type_service),
        statut = COALESCE($8, statut),
        montant_total = COALESCE($9, montant_total),
        montant_recu = COALESCE($10, montant_recu),
        montant_rendu = COALESCE($11, montant_rendu),
        mode_paiement = COALESCE($12, mode_paiement),
        devise_paiement = COALESCE($13, devise_paiement),
        taux_change_id = COALESCE($14, taux_change_id),
        emplacement_id = COALESCE($15, emplacement_id)
      WHERE id_facture_rst = $16
      RETURNING *
    `;

    const values = [
      serveur_id, serveur_nom, caissier_id, caissier_nom,
      nom_client, numero_table, type_service,
      statut, montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      emplacement_id, id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id, statut, caissier_id = null, caissier_nom = null) {
    let query = `
      UPDATE ventes_resto 
      SET statut = $1
    `;
    const values = [statut];
    let paramCount = 2;

    if (statut === 'paye') {
      query += `, paiement_at = CURRENT_TIMESTAMP`;
    }

    if (caissier_id) {
      query += `, caissier_id = $${paramCount}`;
      values.push(caissier_id);
      paramCount++;
    }

    if (caissier_nom) {
      query += `, caissier_nom = $${paramCount}`;
      values.push(caissier_nom);
      paramCount++;
    }

    query += ` WHERE id_facture_rst = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // === NOUVELLE MÉTHODE : Mettre à jour le statut avec gestion cuisine ===
  static async updateStatusAvecCuisine(id, statut, agent_id = null) {
    let query = `
      UPDATE ventes_resto 
      SET statut = $1
    `;
    const values = [statut];
    let paramCount = 2;

    if (statut === 'en_preparation' && agent_id) {
      query += `, agent_cuisine_id = $${paramCount}, debut_preparation = CURRENT_TIMESTAMP`;
      values.push(agent_id);
      paramCount++;
    }

    if (statut === 'en_attente_paiement') {
      query += `, fin_preparation = CURRENT_TIMESTAMP, temps_preparation = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - debut_preparation)) / 60`;
    }

    if (statut === 'paye') {
      query += `, paiement_at = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id_facture_rst = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async getVentesDuJour() {
    const query = `
      SELECT * FROM ventes_resto 
      WHERE DATE(prise_commande_at) = CURRENT_DATE
      ORDER BY prise_commande_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getStatsParServeur(date_debut = null, date_fin = null) {
    let query = `
      SELECT 
        serveur_id,
        serveur_nom,
        COUNT(*) as nombre_ventes,
        SUM(montant_total) as total_ventes,
        AVG(montant_total) as panier_moyen
      FROM ventes_resto
      WHERE statut = 'paye'
    `;
    const values = [];
    let paramCount = 1;

    if (date_debut) {
      query += ` AND prise_commande_at >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND prise_commande_at <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    query += ` GROUP BY serveur_id, serveur_nom ORDER BY total_ventes DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // === NOUVELLE MÉTHODE : Statistiques pour la cuisine ===
  static async getStatsCuisine(date_debut = null, date_fin = null) {
    let query = `
      SELECT 
        COUNT(*) as total_commandes,
        SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
        SUM(CASE WHEN statut = 'en_preparation' THEN 1 ELSE 0 END) as en_preparation,
        SUM(CASE WHEN statut = 'en_attente_paiement' THEN 1 ELSE 0 END) as pretes,
        AVG(temps_preparation) as temps_moyen_preparation
      FROM ventes_resto
      WHERE plat_id IS NOT NULL
    `;
    const values = [];
    let paramCount = 1;

    if (date_debut) {
      query += ` AND prise_commande_at >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND prise_commande_at <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return result.rows[0] || {};
  }

  static async delete(id) {
    const query = `DELETE FROM ventes_resto WHERE id_facture_rst = $1 RETURNING id_facture_rst`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = VenteResto;