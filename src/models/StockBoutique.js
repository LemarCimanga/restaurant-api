const pool = require('../config/database');

class StockBoutique {
  static async create(data) {
    const {
      designation, categorie, marque, genre, taille, couleur,
      code_barre, quantite, seuil_alerte,
      prix_achat, prix_vente, devise
    } = data;

    const query = `
      INSERT INTO stock_boutique (
        designation, categorie, marque, genre, taille, couleur,
        code_barre, quantite, seuil_alerte,
        prix_achat, prix_vente, devise
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      designation, categorie, marque || 'AUTRE', genre, taille, couleur,
      code_barre, quantite || 0, seuil_alerte || 5,
      prix_achat, prix_vente, devise || 'FC'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM stock_boutique WHERE id_article = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByCodeBarre(code_barre) {
    const query = `SELECT * FROM stock_boutique WHERE code_barre = $1`;
    const result = await pool.query(query, [code_barre]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, categorie, genre, marque, taille, couleur } = options;
    
    let query = `SELECT * FROM stock_boutique WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (categorie) {
      query += ` AND categorie = $${paramCount}`;
      values.push(categorie);
      paramCount++;
    }

    if (genre) {
      query += ` AND genre = $${paramCount}`;
      values.push(genre);
      paramCount++;
    }

    if (marque) {
      query += ` AND marque = $${paramCount}`;
      values.push(marque);
      paramCount++;
    }

    if (taille) {
      query += ` AND taille = $${paramCount}`;
      values.push(taille);
      paramCount++;
    }

    if (couleur) {
      query += ` AND couleur = $${paramCount}`;
      values.push(couleur);
      paramCount++;
    }

    query += ` ORDER BY designation ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      designation, categorie, marque, genre, taille, couleur,
      code_barre, quantite, seuil_alerte,
      prix_achat, prix_vente, devise
    } = data;

    const query = `
      UPDATE stock_boutique SET
        designation = COALESCE($1, designation),
        categorie = COALESCE($2, categorie),
        marque = COALESCE($3, marque),
        genre = COALESCE($4, genre),
        taille = COALESCE($5, taille),
        couleur = COALESCE($6, couleur),
        code_barre = COALESCE($7, code_barre),
        quantite = COALESCE($8, quantite),
        seuil_alerte = COALESCE($9, seuil_alerte),
        prix_achat = COALESCE($10, prix_achat),
        prix_vente = COALESCE($11, prix_vente),
        devise = COALESCE($12, devise)
      WHERE id_article = $13
      RETURNING *
    `;

    const values = [
      designation, categorie, marque, genre, taille, couleur,
      code_barre, quantite, seuil_alerte,
      prix_achat, prix_vente, devise,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateStock(id, quantite) {
    const query = `
      UPDATE stock_boutique 
      SET quantite = quantite + $1
      WHERE id_article = $2
      RETURNING *
    `;
    const result = await pool.query(query, [quantite, id]);
    return result.rows[0] || null;
  }

  static async getAlertes() {
    const query = `
      SELECT * FROM stock_boutique 
      WHERE quantite <= seuil_alerte
      ORDER BY quantite ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM stock_boutique WHERE id_article = $1 RETURNING id_article`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = StockBoutique;