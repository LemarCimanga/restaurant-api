const { verifyToken } = require('../config/jwt');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token d authentification requis'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Format de token invalide. Utilisez: Bearer <token>'
      });
    }

    const token = parts[1];
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou expire'
      });
    }

    req.user = {
      id: decoded.id,
      nom: decoded.nom,
      prenom: decoded.prenom,
      matricule: decoded.matricule,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l authentification'
    });
  }
};

module.exports = authenticate;