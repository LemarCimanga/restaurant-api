const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Acces non autorise. Role requis: ${roles.join(', ')}`
      });
    }

    next();
  };
};

const ROLES = {
  ADMIN: 'admin',
  GERANT: 'gerant',
  AGENT_BOUTIQUE: 'agent boutique',
  SERVEUR: 'serveur',
  CAISSIER_RESTO: 'caissier_resto',
  AGENT_CUISINE: 'agent cuisine'
};

const ROLES_GROUPS = {
  ADMIN_OR_GERANT: ['admin', 'gerant'],
  ALL_STAFF: ['admin', 'gerant', 'agent boutique', 'serveur', 'caissier_resto', 'agent cuisine'],
  RESTAURANT: ['admin', 'gerant', 'serveur', 'caissier_resto', 'agent cuisine'],
  BOUTIQUE: ['admin', 'gerant', 'agent boutique']
};

module.exports = {
  authorize,
  ROLES,
  ROLES_GROUPS
};