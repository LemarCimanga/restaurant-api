const pool = require('../config/database');

class AuditLog {
  static async create(data) {
    const {
      utilisateur_id, utilisateur_nom, action, niveau,
      table_concernee, enregistrement_id,
      anciennes_valeurs, nouvelles_valeurs,
      details, ip_address, user_agent
    } = data;

    const query = `
      INSERT INTO audit_log (
        utilisateur_id, utilisateur_nom, action, niveau,
        table_concernee, enregistrement_id,
        anciennes_valeurs, nouvelles_valeurs,
        details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      utilisateur_id || null,
      utilisateur_nom,
      action,
      niveau || 'INFO',
      table_concernee || null,
      enregistrement_id || null,
      anciennes_valeurs || null,
      nouvelles_valeurs || null,
      details || null,
      ip_address || null,
      user_agent || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `SELECT * FROM audit_log WHERE id_audit = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(options = {}) {
    const { 
      limit = 100, 
      offset = 0, 
      utilisateur_id, 
      action, 
      niveau,
      table_concernee,
      date_debut,
      date_fin
    } = options;
    
    let query = `SELECT * FROM audit_log WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    if (utilisateur_id) {
      query += ` AND utilisateur_id = $${paramCount}`;
      values.push(utilisateur_id);
      paramCount++;
    }

    if (action) {
      query += ` AND action = $${paramCount}`;
      values.push(action);
      paramCount++;
    }

    if (niveau) {
      query += ` AND niveau = $${paramCount}`;
      values.push(niveau);
      paramCount++;
    }

    if (table_concernee) {
      query += ` AND table_concernee = $${paramCount}`;
      values.push(table_concernee);
      paramCount++;
    }

    if (date_debut) {
      query += ` AND date_heure_action >= $${paramCount}`;
      values.push(date_debut);
      paramCount++;
    }

    if (date_fin) {
      query += ` AND date_heure_action <= $${paramCount}`;
      values.push(date_fin);
      paramCount++;
    }

    query += ` ORDER BY date_heure_action DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findByUtilisateur(utilisateur_id, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const query = `
      SELECT * FROM audit_log 
      WHERE utilisateur_id = $1
      ORDER BY date_heure_action DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [utilisateur_id, limit, offset]);
    return result.rows;
  }

  static async findByAction(action, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const query = `
      SELECT * FROM audit_log 
      WHERE action = $1
      ORDER BY date_heure_action DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [action, limit, offset]);
    return result.rows;
  }

  static async getStats(periode = 'jour') {
    let interval;
    switch(periode) {
      case 'jour':
        interval = '1 day';
        break;
      case 'semaine':
        interval = '7 days';
        break;
      case 'mois':
        interval = '30 days';
        break;
      default:
        interval = '1 day';
    }

    const query = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT utilisateur_id) as utilisateurs_actifs,
        COUNT(CASE WHEN niveau = 'CRITICAL' THEN 1 END) as erreurs_critiques,
        COUNT(CASE WHEN niveau = 'WARNING' THEN 1 END) as avertissements,
        COUNT(CASE WHEN action LIKE 'LOGIN%' THEN 1 END) as tentatives_connexion,
        COUNT(CASE WHEN action = 'LOGIN_SUCCESS' THEN 1 END) as connexions_reussies,
        COUNT(CASE WHEN action = 'LOGIN_FAILED' THEN 1 END) as connexions_echouees
      FROM audit_log
      WHERE date_heure_action >= CURRENT_TIMESTAMP - INTERVAL '${interval}'
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getActionsParNiveau() {
    const query = `
      SELECT 
        niveau,
        COUNT(*) as nombre,
        MIN(date_heure_action) as premier_log,
        MAX(date_heure_action) as dernier_log
      FROM audit_log
      GROUP BY niveau
      ORDER BY 
        CASE niveau
          WHEN 'CRITICAL' THEN 1
          WHEN 'WARNING' THEN 2
          WHEN 'INFO' THEN 3
        END
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async deleteOldLogs(jours = 180) {
    const query = `
      DELETE FROM audit_log 
      WHERE date_heure_action < CURRENT_TIMESTAMP - INTERVAL '${jours} days'
      RETURNING id_audit
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async delete(id) {
    const query = `DELETE FROM audit_log WHERE id_audit = $1 RETURNING id_audit`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = AuditLog;