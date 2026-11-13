const mongoose = require('mongoose');

// Retrieve reservation by 10-digit reference
const getReservation = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { reference } = req.params;

    // Search in reservations collection
    let reservation = await db.collection('reservations').findOne({ reference });
    let pkg = reservation?.package;

    // Fallback: check packages collection directly
    if (!pkg) {
      pkg = await db.collection('packages').findOne({
        $or: [
          { 'booking.reference': reference },
          { reference: reference },
          { id: reference }
        ]
      });
    }

    if (!pkg && !reservation) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Reservation #${reference} was not found. Please verify the 10-digit number.`,
          code: 'RESERVATION_NOT_FOUND'
        }
      });
    }

    const basePkg = pkg || reservation;
    const bookedAt = basePkg.booking?.bookedAt || reservation?.createdAt || new Date().toISOString();

    const confirmedPackage = {
      ...basePkg,
      status: 'BOOKED',
      booking: {
        reference,
        bookedAt
      },
      reference
    };

    res.status(200).json({
      success: true,
      data: confirmedPackage
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Error retrieving reservation',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

module.exports = {
  getReservation
};
