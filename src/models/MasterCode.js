const db = require('../config/database');

class MasterCode {
  static async verify(code) {
    try {
      const result = await db.query(
        'SELECT * FROM master_codes WHERE code_hash = \$1 AND is_active = true',
        [code]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur vérification master code:', error);
      return false;
    }
  }
}

module.exports = MasterCode;
