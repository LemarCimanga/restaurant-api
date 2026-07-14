const pool = require('../config/database');

async function ajouterLog(data) {
  const {
    utilisateur_id = null,
    utilisateur_nom,
    action,
    niveau = 'INFO',
    table_concernee = null,
    enregistrement_id = null,
    anciennes_valeurs = null,
    nouvelles_valeurs = null,
    details = null,
    ip_address = null,
    user_agent = null
  } = data;

  const query = `
    INSERT INTO audit_log (
      utilisateur_id, utilisateur_nom, action, niveau,
      table_concernee, enregistrement_id,
      anciennes_valeurs, nouvelles_valeurs,
      details, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id_audit
  `;

  const values = [
    utilisateur_id,
    utilisateur_nom,
    action,
    niveau,
    table_concernee,
    enregistrement_id,
    anciennes_valeurs,
    nouvelles_valeurs,
    details,
    ip_address,
    user_agent
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erreur lors de l ajout du log d audit:', error);
    return null;
  }
}

module.exports = { ajouterLog };