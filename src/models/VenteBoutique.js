const pool = require('../config/database');

class VenteBoutique {
  static async create(data) {
    const {
      vendeur_id, vendeur_nom, vendeur_photo_uri,
      nom_client, numero_client,
      montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      reseau_mobile, numero_commercant, code_confirmation, frais_retrait,
      consentement_whatsapp
    } = data;

    const query = `
      INSERT INTO ventes_boutique (
        vendeur_id, vendeur_nom, vendeur_photo_uri,
        nom_client, numero_client,
        montant_total, montant_recu, montant_rendu,
        mode_paiement, devise_paiement, taux_change_id,
        reseau_mobile, numero_commercant, code_confirmation, frais_retrait,
        consentement_whatsapp, statut, date_heure_vente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'validee', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      vendeur_id, vendeur_nom, vendeur_photo_uri || null,
      nom_client, numero_client,
      montant_total, montant_recu || 0, montant_rendu || 0,
      mode_paiement, devise_paiement || 'FC', taux_change_id || null,
      reseau_mobile || null, numero_commercant || null, code_confirmation || null, frais_retrait || 0,
      consentement_whatsapp || false
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT v.*, 
             COALESCE(u.nom, '') as vendeur_nom_complet
      FROM ventes_boutique v
      LEFT JOIN utilisateurs u ON v.vendeur_id = u.id
      WHERE v.id_vente_bqt = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, vendeur_id, statut, date_debut, date_fin } = options;
    
    let query = `SELECT * FROM ventes_boutique WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (vendeur_id) {
      query += ` AND vendeur_id = $${paramCount}`;
      values.push(vendeur_id);
      paramCount++;
    }

    if (statut) {
      query += ` AND statut = $${paramCount}`;
      values.push(statut);
      paramCount++;
    }

    if (date_debut) {
      query += ` AND date_heure_vente >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND date_heure_vente <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    query += ` ORDER BY date_heure_vente DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      vendeur_id, vendeur_nom, vendeur_photo_uri,
      nom_client, numero_client,
      montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      reseau_mobile, numero_commercant, code_confirmation, frais_retrait,
      consentement_whatsapp, whatsapp_envoye
    } = data;

    const query = `
      UPDATE ventes_boutique SET
        vendeur_id = COALESCE($1, vendeur_id),
        vendeur_nom = COALESCE($2, vendeur_nom),
        vendeur_photo_uri = COALESCE($3, vendeur_photo_uri),
        nom_client = COALESCE($4, nom_client),
        numero_client = COALESCE($5, numero_client),
        montant_total = COALESCE($6, montant_total),
        montant_recu = COALESCE($7, montant_recu),
        montant_rendu = COALESCE($8, montant_rendu),
        mode_paiement = COALESCE($9, mode_paiement),
        devise_paiement = COALESCE($10, devise_paiement),
        taux_change_id = COALESCE($11, taux_change_id),
        reseau_mobile = COALESCE($12, reseau_mobile),
        numero_commercant = COALESCE($13, numero_commercant),
        code_confirmation = COALESCE($14, code_confirmation),
        frais_retrait = COALESCE($15, frais_retrait),
        consentement_whatsapp = COALESCE($16, consentement_whatsapp),
        whatsapp_envoye = COALESCE($17, whatsapp_envoye)
      WHERE id_vente_bqt = $18
      RETURNING *
    `;

    const values = [
      vendeur_id, vendeur_nom, vendeur_photo_uri,
      nom_client, numero_client,
      montant_total, montant_recu, montant_rendu,
      mode_paiement, devise_paiement, taux_change_id,
      reseau_mobile, numero_commercant, code_confirmation, frais_retrait,
      consentement_whatsapp, whatsapp_envoye,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStatus(id, statut) {
    const query = `
      UPDATE ventes_boutique 
      SET statut = $1
      WHERE id_vente_bqt = $2
      RETURNING *
    `;
    const result = await pool.query(query, [statut, id]);
    return result.rows[0] || null;
  }

  static async marquerWhatsappEnvoye(id) {
    const query = `
      UPDATE ventes_boutique 
      SET whatsapp_envoye = true
      WHERE id_vente_bqt = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getVentesDuJour() {
    const query = `
      SELECT * FROM ventes_boutique 
      WHERE DATE(date_heure_vente) = CURRENT_DATE
      ORDER BY date_heure_vente DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getStatsParVendeur(date_debut = null, date_fin = null) {
    let query = `
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

    if (date_debut) {
      query += ` AND date_heure_vente >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND date_heure_vente <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    query += ` GROUP BY vendeur_id, vendeur_nom ORDER BY total_ventes DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM ventes_boutique WHERE id_vente_bqt = $1 RETURNING id_vente_bqt`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = VenteBoutique;