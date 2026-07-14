const pool = require('../config/database');

class StockNourriture {
  static async create(data) {
    const {
      designation, emplacement, categorie, fournisseur, origine,
      stock_unite, seuil_alerte,
      prix_achat_unite, prix_vente_unite, devise_prix
    } = data;

    const query = `
      INSERT INTO stock_nourriture (
        designation, emplacement, categorie, fournisseur, origine,
        stock_unite, seuil_alerte,
        prix_achat_unite, prix_vente_unite, devise_prix
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      designation, emplacement, categorie, fournisseur, origine,
      stock_unite || 0, seuil_alerte || 5,
      prix_achat_unite, prix_vente_unite, devise_prix || 'FC'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM stock_nourriture WHERE id_produit = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, emplacement, categorie } = options;
    
    let query = `SELECT * FROM stock_nourriture WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (emplacement) {
      query += ` AND emplacement = $${paramCount}`;
      values.push(emplacement);
      paramCount++;
    }

    if (categorie) {
      query += ` AND categorie = $${paramCount}`;
      values.push(categorie);
      paramCount++;
    }

    query += ` ORDER BY designation ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      designation, emplacement, categorie, fournisseur, origine,
      stock_unite, seuil_alerte,
      prix_achat_unite, prix_vente_unite, devise_prix
    } = data;

    const query = `
      UPDATE stock_nourriture SET
        designation = COALESCE($1, designation),
        emplacement = COALESCE($2, emplacement),
        categorie = COALESCE($3, categorie),
        fournisseur = COALESCE($4, fournisseur),
        origine = COALESCE($5, origine),
        stock_unite = COALESCE($6, stock_unite),
        seuil_alerte = COALESCE($7, seuil_alerte),
        prix_achat_unite = COALESCE($8, prix_achat_unite),
        prix_vente_unite = COALESCE($9, prix_vente_unite),
        devise_prix = COALESCE($10, devise_prix)
      WHERE id_produit = $11
      RETURNING *
    `;

    const values = [
      designation, emplacement, categorie, fournisseur, origine,
      stock_unite, seuil_alerte,
      prix_achat_unite, prix_vente_unite, devise_prix,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStock(id, quantite) {
    const query = `
      UPDATE stock_nourriture 
      SET stock_unite = stock_unite + $1
      WHERE id_produit = $2
      RETURNING *
    `;
    const result = await pool.query(query, [quantite, id]);
    return result.rows[0] || null;
  }

  static async getAlertes() {
    const query = `
      SELECT * FROM stock_nourriture 
      WHERE stock_unite <= seuil_alerte
      ORDER BY stock_unite ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM stock_nourriture WHERE id_produit = $1 RETURNING id_produit`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = StockNourriture;