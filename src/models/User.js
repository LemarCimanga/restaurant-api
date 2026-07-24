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

  // ============================================================
  // MÉTHODES SPÉCIFIQUES POUR LE GÉRANT
  // ============================================================

  // Trouver les utilisateurs par rôle
  static async findByRole(role) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE role = $1
      ORDER BY nom ASC
    `;
    const result = await pool.query(query, [role]);
    return result.rows;
  }

  // Trouver tous les agents (serveur, agent boutique, agent cuisine, caissier_resto)
  static async findAllAgents() {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto')
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Compter les utilisateurs par rôle
  static async countByRole() {
    const query = `
      SELECT role, COUNT(*) as total
      FROM utilisateurs
      WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto', 'admin', 'gerant')
      GROUP BY role
      ORDER BY total DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Statistiques des agents (actifs, suspendus, total)
  static async getAgentsStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN statut = 'actif' THEN 1 END) as actifs,
        COUNT(CASE WHEN statut = 'suspendu' THEN 1 END) as suspendus,
        COUNT(CASE WHEN statut = 'archive' THEN 1 END) as archives
      FROM utilisateurs
      WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto')
    `;
    const result = await pool.query(query);
    return result.rows[0] || { total: 0, actifs: 0, suspendus: 0, archives: 0 };
  }

  // Rechercher des utilisateurs
  static async search(searchTerm) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE nom ILIKE $1 
         OR postnom ILIKE $1
         OR prenom ILIKE $1
         OR matricule ILIKE $1
         OR numero_telephone ILIKE $1
      ORDER BY nom ASC
    `;
    const result = await pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  // Trouver les utilisateurs créés par un gérant
  static async findByCreator(created_by) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, numero_telephone,
             role, statut, photo, derniere_connexion, created_at
      FROM utilisateurs
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [created_by]);
    return result.rows;
  }

  // Mettre à jour plusieurs statuts (bloquer/débloquer en masse)
  static async updateMultipleStatus(ids, statut) {
    const query = `
      UPDATE utilisateurs 
      SET statut = $1
      WHERE id = ANY($2::int[])
      RETURNING id, nom, prenom, statut
    `;
    const result = await pool.query(query, [statut, ids]);
    return result.rows;
  }

  // Obtenir le nombre total d'utilisateurs par statut
  static async getStatusCounts() {
    const query = `
      SELECT statut, COUNT(*) as total
      FROM utilisateurs
      GROUP BY statut
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Vérifier si un matricule existe déjà
  static async matriculeExists(matricule) {
    const query = `SELECT COUNT(*) as count FROM utilisateurs WHERE matricule = $1`;
    const result = await pool.query(query, [matricule]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Obtenir les derniers utilisateurs inscrits
  static async getRecentUsers(limit = 10) {
    const query = `
      SELECT id, nom, postnom, prenom, matricule, role, statut, photo, created_at
      FROM utilisateurs
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Obtenir les utilisateurs par mois (pour graphiques)
  static async getUsersByMonth(year) {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM created_at) as mois,
        COUNT(*) as total
      FROM utilisateurs
      WHERE EXTRACT(YEAR FROM created_at) = $1
      GROUP BY EXTRACT(MONTH FROM created_at)
      ORDER BY mois ASC
    `;
    const result = await pool.query(query, [year]);
    return result.rows;
  }

  // Obtenir les agents avec leurs dernières connexions
  static async getAgentsWithLastLogin() {
    const query = `
      SELECT 
        id, nom, postnom, prenom, matricule, role, statut, photo,
        derniere_connexion,
        CASE 
          WHEN derniere_connexion IS NULL THEN 'Jamais connecté'
          WHEN derniere_connexion >= CURRENT_DATE - INTERVAL '7 days' THEN 'Actif cette semaine'
          WHEN derniere_connexion >= CURRENT_DATE - INTERVAL '30 days' THEN 'Actif ce mois'
          ELSE 'Inactif depuis plus d\'un mois'
        END as activite
      FROM utilisateurs
      WHERE role IN ('serveur', 'agent boutique', 'agent cuisine', 'caissier_resto')
      ORDER BY derniere_connexion DESC NULLS LAST
    `;
    const result = await pool.query(query);
    return result.rows;
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