const pool = require('../config/database');

class StockBoisson {
  static async create(data) {
    const {
      designation, nature, fournisseur, origine,
      stock_general_casier, stock_general_unite, taux_conversion,
      stock_congelateur_unite, seuil_alerte,
      prix_achat_gros, prix_vente_detail, devise_prix
    } = data;

    const query = `
      INSERT INTO stock_boissons (
        designation, nature, fournisseur, origine,
        stock_general_casier, stock_general_unite, taux_conversion,
        stock_congelateur_unite, seuil_alerte,
        prix_achat_gros, prix_vente_detail, devise_prix
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      designation, nature, fournisseur, origine,
      stock_general_casier || 0, stock_general_unite || 0, taux_conversion || 12,
      stock_congelateur_unite || 0, seuil_alerte || 5,
      prix_achat_gros, prix_vente_detail, devise_prix || 'FC'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM stock_boissons WHERE id_produit = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, nature, origine } = options;
    
    let query = `SELECT * FROM stock_boissons WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (nature) {
      query += ` AND nature = $${paramCount}`;
      values.push(nature);
      paramCount++;
    }

    if (origine) {
      query += ` AND origine = $${paramCount}`;
      values.push(origine);
      paramCount++;
    }

    query += ` ORDER BY designation ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      designation, nature, fournisseur, origine,
      stock_general_casier, stock_general_unite, taux_conversion,
      stock_congelateur_unite, seuil_alerte,
      prix_achat_gros, prix_vente_detail, devise_prix
    } = data;

    const query = `
      UPDATE stock_boissons SET
        designation = COALESCE($1, designation),
        nature = COALESCE($2, nature),
        fournisseur = COALESCE($3, fournisseur),
        origine = COALESCE($4, origine),
        stock_general_casier = COALESCE($5, stock_general_casier),
        stock_general_unite = COALESCE($6, stock_general_unite),
        taux_conversion = COALESCE($7, taux_conversion),
        stock_congelateur_unite = COALESCE($8, stock_congelateur_unite),
        seuil_alerte = COALESCE($9, seuil_alerte),
        prix_achat_gros = COALESCE($10, prix_achat_gros),
        prix_vente_detail = COALESCE($11, prix_vente_detail),
        devise_prix = COALESCE($12, devise_prix)
      WHERE id_produit = $13
      RETURNING *
    `;

    const values = [
      designation, nature, fournisseur, origine,
      stock_general_casier, stock_general_unite, taux_conversion,
      stock_congelateur_unite, seuil_alerte,
      prix_achat_gros, prix_vente_detail, devise_prix,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStock(id, type, quantite) {
    let query = '';
    if (type === 'casier') {
      query = `
        UPDATE stock_boissons 
        SET stock_general_casier = stock_general_casier + $1
        WHERE id_produit = $2
        RETURNING *
      `;
    } else if (type === 'unite') {
      query = `
        UPDATE stock_boissons 
        SET stock_general_unite = stock_general_unite + $1
        WHERE id_produit = $2
        RETURNING *
      `;
    } else if (type === 'congelateur') {
      query = `
        UPDATE stock_boissons 
        SET stock_congelateur_unite = stock_congelateur_unite + $1
        WHERE id_produit = $2
        RETURNING *
      `;
    }

    const result = await pool.query(query, [quantite, id]);
    return result.rows[0] || null;
  }

  static async getAlertes() {
    const query = `
      SELECT * FROM stock_boissons 
      WHERE stock_congelateur_unite <= seuil_alerte
      ORDER BY stock_congelateur_unite ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM stock_boissons WHERE id_produit = $1 RETURNING id_produit`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = StockBoisson;