const pool = require('../config/database');

class TauxChange {
  static async create(data) {
    const {
      devise, taux, symbole, date_debut, date_fin, modifie_par
    } = data;

    const query = `
      INSERT INTO taux_change (
        devise, taux, symbole, date_debut, date_fin, modifie_par
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      devise, taux, symbole, date_debut, date_fin || null, modifie_par || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM taux_change WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findCurrentByDevise(devise) {
    const query = `
      SELECT * FROM taux_change 
      WHERE devise = $1 AND date_fin IS NULL
      ORDER BY date_debut DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [devise]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { limit = 100, offset = 0, devise } = options;
    
    let query = `SELECT * FROM taux_change WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (devise) {
      query += ` AND devise = $${paramCount}`;
      values.push(devise);
      paramCount++;
    }

    query += ` ORDER BY date_debut DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getAllCurrent() {
    const query = `
      SELECT * FROM taux_change 
      WHERE date_fin IS NULL
      ORDER BY devise ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, data) {
    const {
      taux, symbole, date_fin, modifie_par
    } = data;

    const query = `
      UPDATE taux_change SET
        taux = COALESCE($1, taux),
        symbole = COALESCE($2, symbole),
        date_fin = COALESCE($3, date_fin),
        modifie_par = COALESCE($4, modifie_par),
        modifie_le = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const values = [
      taux, symbole, date_fin, modifie_par, id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async updateCurrent(id, taux, modifie_par) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Marquer l'ancien taux comme fini
      await client.query(
        `UPDATE taux_change SET date_fin = CURRENT_DATE WHERE id = $1`,
        [id]
      );

      // Recuperer la devise et le symbole de l'ancien taux
      const old = await client.query(
        `SELECT devise, symbole FROM taux_change WHERE id = $1`,
        [id]
      );

      // Creer le nouveau taux
      const result = await client.query(
        `INSERT INTO taux_change (devise, taux, symbole, date_debut, modifie_par)
         VALUES ($1, $2, $3, CURRENT_DATE, $4)
         RETURNING *`,
        [old.rows[0].devise, taux, old.rows[0].symbole, modifie_par]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTauxConversion(devise, montant) {
    const taux = await this.findCurrentByDevise(devise);
    if (!taux) {
      throw new Error(`Taux de change pour ${devise} non trouve`);
    }
    return montant * taux.taux;
  }

  static async delete(id) {
    const query = `DELETE FROM taux_change WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = TauxChange;