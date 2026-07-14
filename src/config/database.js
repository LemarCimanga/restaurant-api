const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_x8iSFQ6kvtOr@ep-cold-night-atp3gryj-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Erreur de connexion:', err.message);
  } else {
    console.log('Connecte a PostgreSQL (Neon)');
    release();
  }
});

module.exports = pool;