const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err);

  // Erreur de validation Joi
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Donnees invalides',
      details: err.details || err.message
    });
  }

  // Erreur de base de donnees - contrainte unique
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Conflit: cette valeur existe deja',
      details: err.detail || err.message
    });
  }

  // Erreur de base de donnees - cle etrangere
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Reference invalide',
      details: err.message
    });
  }

  // Erreur de stock insuffisant
  if (err.message && err.message.includes('Stock insuffisant')) {
    return res.status(400).json({
      success: false,
      error: 'Stock insuffisant',
      details: err.message
    });
  }

  // Erreur par defaut
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Erreur interne du serveur';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;