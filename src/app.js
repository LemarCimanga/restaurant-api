const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// ============ TRUST PROXY (RENDER) ============
// ✅ Configuration optimale pour Render
app.set('trust proxy', 1); // 1 proxy devant l'application

// ============ MIDDLEWARES ============

// Sécurité
app.use(helmet());

// Compression
app.use(compression());

// CORS - Autorise les requêtes de l'app Flutter
app.use(cors());

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting - Protection contre les attaques (configuré pour Render)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  trustProxy: true, // ✅ Indique que le proxy est fiable
  skip: (req) => req.ip === '127.0.0.1' // ✅ Ignorer les requêtes locales
});
app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ============ ROUTES ============

// Routes d'authentification
app.use('/api/auth', require('./routes/authRoutes'));

// Routes des stocks
app.use('/api/stocks', require('./routes/stockRoutes'));

// Routes des ventes restaurant
app.use('/api/ventes/resto', require('./routes/venteRestoRoutes'));

// Routes des ventes boutique
app.use('/api/ventes/boutique', require('./routes/venteBoutiqueRoutes'));

// Routes des rapports
app.use('/api/rapports', require('./routes/rapportRoutes'));

// Routes des parametres
app.use('/api/parametres', require('./routes/parametreRoutes'));

// Routes de l'audit
app.use('/api/audit', require('./routes/auditRoutes'));

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Route 404 - Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

module.exports = app;