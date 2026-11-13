const express = require('express');
const router = express.Router();
const { getReservation } = require('../controllers/reservationController');

router.get('/:reference', getReservation);

module.exports = router;

