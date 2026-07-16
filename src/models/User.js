const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async generateMatricule() {
    const prefix = 'KASH';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  static async create(userData) {
    const { 
      nom, postnom, prenom, matricule, numero_telephone, 
      mot_de_passe, photo, role, created_by 
    } = userData;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mot_de_passe, salt);

    const query = `
      INSERT INTO utilisateurs (
        nom, postnom, prenom, matricule, numero_telephone,
        mot_de_passe, photo, role, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, nom, postnom, prenom, matricule, numero_telephone, 
                role, statut, photo, created_at
    `;

    const values = [
      nom, postnom, prenom, matricule, numero_telephone,
      hashedPassword, photo, role, created_by
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByMatricule(matricule) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             mot_de_passe, role, statut, photo, tentative_connexion,
             verrouille_jusqua, derniere_connexion, created_at
      FROM utilisateurs
      WHERE matricule = $1
    `;
    const result = await pool.query(query, [matricule]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id) {
    const query = `
      UPDATE utilisateurs 
      SET derniere_connexion = CURRENT_TIMESTAMP,
          tentative_connexion = 0
      WHERE id = $1
      RETURNING id, nom, prenom, role
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async incrementAttempts(matricule) {
    const query = `
      UPDATE utilisateurs 
      SET tentative_connexion = tentative_connexion + 1
      WHERE matricule = $1
      RETURNING tentative_connexion, verrouille_jusqua
    `;
    const result = await pool.query(query, [matricule]);
    return result.rows[0];
  }

  static async lockAccount(matricule, durationMinutes = 30) {
    const query = `
      UPDATE utilisateurs 
      SET verrouille_jusqua = CURRENT_TIMESTAMP + INTERVAL '${durationMinutes} minutes'
      WHERE matricule = $1
      RETURNING id, verrouille_jusqua
    `;
    const result = await pool.query(query, [matricule]);
    return result.rows[0];
  }

  static async resetAttempts(id) {
    const query = `
      UPDATE utilisateurs 
      SET tentative_connexion = 0,
          verrouille_jusqua = NULL
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }

  static async changePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const query = `
      UPDATE utilisateurs 
      SET mot_de_passe = $1
      WHERE id = $2
    `;
    await pool.query(query, [hashedPassword, id]);
  }

  static async updateStatus(id, statut) {
    const query = `
      UPDATE utilisateurs 
      SET statut = $1
      WHERE id = $2
      RETURNING id, nom, prenom, statut
    `;
    const result = await pool.query(query, [statut, id]);
    return result.rows[0];
  }

  static async updatePhoto(id, photo) {
    const query = `
      UPDATE utilisateurs 
      SET photo = $1
      WHERE id = $2
      RETURNING id, nom, prenom, photo
    `;
    const result = await pool.query(query, [photo, id]);
    return result.rows[0];
  }

  static async updateProfile(id, data) {
    const { nom, postnom, prenom, numero_telephone } = data;
    
    const query = `
      UPDATE utilisateurs 
      SET nom = COALESCE($1, nom),
          postnom = COALESCE($2, postnom),
          prenom = COALESCE($3, prenom),
          numero_telephone = COALESCE($4, numero_telephone)
      WHERE id = $5
      RETURNING id, nom, postnom, prenom, matricule, numero_telephone,
                role, statut, photo, derniere_connexion, created_at
    `;
    const result = await pool.query(query, [nom, postnom, prenom, numero_telephone, id]);
    return result.rows[0];
  }

  static async archive(id) {
    const query = `
      UPDATE utilisateurs 
      SET statut = 'archive'
      WHERE id = $1
      RETURNING id, nom, prenom
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(options = {}) {
    const { limit = 50, offset = 0, role, statut } = options;
    
    let query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    if (statut) {
      query += ` AND statut = $${paramCount}`;
      values.push(statut);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = User;