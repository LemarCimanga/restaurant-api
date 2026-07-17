const pool = require('../config/database');

class Plat {
  static async create(data) {
    const {
      nom, description, categorie, prix_vente, devise,
      temps_preparation, est_disponible, image_url, created_by
    } = data;

    const query = `
      INSERT INTO plats (
        nom, description, categorie, prix_vente, devise,
        temps_preparation, est_disponible, image_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      nom, description, categorie, prix_vente,
      devise || 'FC', temps_preparation || 15,
      est_disponible !== undefined ? est_disponible : true,
      image_url, created_by
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM plats WHERE id_plat = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, categorie, est_disponible, search } = options;
    
    let query = `SELECT * FROM plats WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (categorie) {
      query += ` AND categorie = $${paramCount}`;
      values.push(categorie);
      paramCount++;
    }

    if (est_disponible !== undefined) {
      query += ` AND est_disponible = $${paramCount}`;
      values.push(est_disponible);
      paramCount++;
    }

    if (search) {
      query += ` AND nom ILIKE $${paramCount}`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY nom ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, data) {
    const {
      nom, description, categorie, prix_vente, devise,
      temps_preparation, est_disponible, image_url
    } = data;

    const query = `
      UPDATE plats SET
        nom = COALESCE($1, nom),
        description = COALESCE($2, description),
        categorie = COALESCE($3, categorie),
        prix_vente = COALESCE($4, prix_vente),
        devise = COALESCE($5, devise),
        temps_preparation = COALESCE($6, temps_preparation),
        est_disponible = COALESCE($7, est_disponible),
        image_url = COALESCE($8, image_url)
      WHERE id_plat = $9
      RETURNING *
    `;

    const values = [
      nom, description, categorie, prix_vente,
      devise, temps_preparation, est_disponible, image_url, id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async delete(id) {
    const query = `DELETE FROM plats WHERE id_plat = $1 RETURNING id_plat`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getPrix(id) {
    const query = `SELECT get_prix_plat($1) as prix`;
    const result = await pool.query(query, [id]);
    return result.rows[0]?.prix || null;
  }

  static async getTempsPreparation(id) {
    const query = `SELECT get_temps_preparation_plat($1) as temps`;
    const result = await pool.query(query, [id]);
    return result.rows[0]?.temps || 0;
  }
}

module.exports = Plat;