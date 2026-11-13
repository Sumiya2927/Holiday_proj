const express = require('express');
const router = express.Router();
const {
  generatePackage,
  getPackageById,
  getAlternatives,
  modifyPackage,
  confirmPackage,
  exportPackage
} = require('../controllers/packageController');

router.post('/generate', generatePackage);
router.get('/:id/alternatives', getAlternatives);
router.get('/:id', getPackageById);
router.patch('/:id', modifyPackage);
router.post('/:id/confirm', confirmPackage);
router.get('/:id/export', exportPackage);

module.exports = router;
