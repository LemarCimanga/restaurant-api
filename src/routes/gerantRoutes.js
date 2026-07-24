// src/routes/gerantRoutes.js
const express = require('express');
const router = express.Router();
const gerantController = require('../controllers/gerantController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Toutes les routes nécessitent authentification + rôle gérant
router.use(authenticate);
router.use(authorize(['gerant', 'admin']));

// ============================================================
// DASHBOARD
// ============================================================
router.get('/dashboard', gerantController.getDashboard);
router.get('/dashboard/kpi', gerantController.getKPI);
router.get('/dashboard/alertes', gerantController.getAlertes);
router.get('/dashboard/top-produits', gerantController.getTopProduits);

// ============================================================
// STOCKS
// ============================================================
router.get('/stocks', gerantController.getStocks);
router.post('/stocks/transferer', gerantController.transfererStock);
router.put('/stocks/seuil', gerantController.modifierSeuil);

// ============================================================
// AGENTS
// ============================================================
router.get('/agents', gerantController.getAgents);
router.post('/agents/:id/bloquer', gerantController.bloquerAgent);
router.post('/agents/:id/debloquer', gerantController.debloquerAgent);

// ============================================================
// DÉPENSES
// ============================================================
router.get('/depenses', gerantController.getDepenses);
router.post('/depenses', gerantController.createDepense);
router.get('/depenses/resume', gerantController.getResumeDepenses);

// ============================================================
// RAPPORTS
// ============================================================
router.get('/rapport/journalier', gerantController.getRapportJournalier);
router.get('/rapport/evolution', gerantController.getRapportEvolution);

// ============================================================
// AUDIT
// ============================================================
router.get('/audit', gerantController.getAudit);
router.get('/audit/export', gerantController.getAudit); // À personnaliser pour export

module.exports = router;