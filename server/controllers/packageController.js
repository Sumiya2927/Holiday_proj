const mongoose = require('mongoose');
const {
  buildPackageFromDB,
  findAlternativesFromDB,
  modifyPackageInDB
} = require('../services/packageGenerator');

// Normalize request body from frontend formats
function normalizeRequest(body) {
  const airport = body.departure_airport || (body.departureCity === 'Bengaluru' ? 'BLR' : body.departureCity === 'Delhi' ? 'DEL' : body.departureCity === 'Mumbai' ? 'BOM' : body.departureCity === 'Chennai' ? 'MAA' : body.departureCity || 'BLR');
  const country = body.country || (body.destinationCountry?.toLowerCase().includes('emirates') ? 'AE' : 'JP');
  const startDate = body.start_date || body.startDate || '2027-04-10';
  const nights = Number(body.nights || 6);
  const adults = Number(body.adults || 2);
  const childrenAges = Array.isArray(body.children_ages) ? body.children_ages : Array.isArray(body.childrenAges) ? body.childrenAges : [];
  const budget = Number(body.budget || 350000);

  return {
    departure_airport: airport,
    country,
    start_date: startDate,
    nights,
    adults,
    children_ages: childrenAges,
    budget,
    city_plan: body.city_plan,
    preferences: body.preferences
  };
}

// Generate new package
const generatePackage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const normalized = normalizeRequest(req.body);

    const pkg = await buildPackageFromDB(normalized);

    // Also generate alternate packages for Good-to-Have G4 (Cheapest, Fastest, Best Rated)
    const pkgFastest = await buildPackageFromDB(normalized, { flavor: 'fastest', id: `${pkg.id}-fastest` });
    const pkgBestRated = await buildPackageFromDB(normalized, { flavor: 'best_rated', id: `${pkg.id}-rated` });

    pkg.packages = [
      { ...pkg, badge: 'Cheapest', label: 'Best Value', description: 'Lowest total price package' },
      { ...pkgFastest, badge: 'Fastest', label: 'Quickest Journey', description: 'Least total travel duration' },
      { ...pkgBestRated, badge: 'Best Rated', label: 'Top Rated', description: 'Highest average hotel rating' }
    ];

    // Persist to MongoDB
    await db.collection('packages').insertOne({ ...pkg });
    await db.collection('packages').insertOne({ ...pkgFastest });
    await db.collection('packages').insertOne({ ...pkgBestRated });

    res.status(200).json({
      success: true,
      data: pkg
    });
  } catch (error) {
    console.error('Error generating package:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to generate package',
        code: 'GENERATION_FAILED'
      }
    });
  }
};

// Retrieve package by ID
const getPackageById = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;

    const pkg = await db.collection('packages').findOne({ id });
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Package with ID ${id} was not found.`,
          code: 'PACKAGE_NOT_FOUND'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: pkg
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Error retrieving package',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

// Get alternatives for a component (flight, hotel, attraction, city_plan)
const getAlternatives = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;

    const pkg = await db.collection('packages').findOne({ id });
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: { message: `Package ${id} not found`, code: 'PACKAGE_NOT_FOUND' }
      });
    }

    const result = await findAlternativesFromDB(pkg, req.query);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting alternatives:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'ALTERNATIVES_FAILED' }
    });
  }
};

// Modify package component (flight, hotel, attractions, city plan)
const modifyPackage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    const change = req.body;

    const pkg = await db.collection('packages').findOne({ id });
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: { message: `Package ${id} not found`, code: 'PACKAGE_NOT_FOUND' }
      });
    }

    if (pkg.status === 'BOOKED') {
      return res.status(403).json({
        success: false,
        error: { message: 'Confirmed packages cannot be modified.', code: 'FORBIDDEN' }
      });
    }

    const updatedPkg = await modifyPackageInDB(pkg, change);

    // Update in MongoDB
    await db.collection('packages').replaceOne({ id }, updatedPkg);

    res.status(200).json({
      success: true,
      data: updatedPkg
    });
  } catch (error) {
    console.error('Error modifying package:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message || 'Update failed', code: 'UPDATE_FAILED' }
    });
  }
};

// Confirm package booking
const confirmPackage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;

    const pkg = await db.collection('packages').findOne({ id });
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: { message: `Package ${id} not found`, code: 'PACKAGE_NOT_FOUND' }
      });
    }

    // Generate collision-free unique 10-digit reservation number
    let reference;
    let existing;
    do {
      reference = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      existing = await db.collection('reservations').findOne({ reference });
    } while (existing);

    pkg.status = 'BOOKED';
    pkg.booking = {
      reference,
      bookedAt: new Date().toISOString()
    };
    pkg.reference = reference;
    pkg.updatedAt = new Date();

    await db.collection('packages').updateOne(
      { id },
      { $set: { status: 'BOOKED', booking: pkg.booking, reference, updatedAt: pkg.updatedAt } }
    );

    const reservationDoc = {
      reference,
      packageId: id,
      status: 'BOOKED',
      createdAt: new Date(),
      updatedAt: new Date(),
      package: pkg
    };

    await db.collection('reservations').insertOne(reservationDoc);

    res.status(200).json({
      success: true,
      data: {
        ...pkg,
        booking: pkg.booking,
        reference
      }
    });
  } catch (error) {
    console.error('Error confirming package:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message, code: 'CONFIRM_FAILED' }
    });
  }
};

// Export package JSON adhering to DATA_DICTIONARY section 4 shared trip format
const exportPackage = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { id } = req.params;
    let pkg = await db.collection('packages').findOne({ id });
    if (!pkg) {
      pkg = await db.collection('packages').findOne({ 'booking.reference': id });
    }
    if (!pkg) {
      const reservation = await db.collection('reservations').findOne({ reference: id });
      pkg = reservation?.package;
    }
    if (!pkg) {
      return res.status(404).json({ success: false, error: { message: 'Package not found' } });
    }

    // Clean payload adhering to Section 4 trip format
    // Strips internal MongoDB metadata (_id, __v, packages array) and ensures required fields
    const exportPayload = {
      country: pkg.country,
      status: pkg.status || 'DRAFT',
      booking: pkg.booking ? {
        reference: String(pkg.booking.reference),
        bookedAt: pkg.booking.bookedAt
      } : null,
      request: {
        departure_airport: pkg.request?.departure_airport,
        country: pkg.request?.country || pkg.country,
        start_date: pkg.request?.start_date,
        nights: Number(pkg.request?.nights),
        adults: Number(pkg.request?.adults),
        children_ages: pkg.request?.children_ages || [],
        budget: Number(pkg.request?.budget)
      },
      return_date: pkg.return_date,
      city_plan: pkg.city_plan?.map(c => ({
        city: c.city,
        nights: Number(c.nights)
      })),
      pricing: {
        flights: pkg.pricing?.flights,
        hotels: pkg.pricing?.hotels,
        transfers: pkg.pricing?.transfers,
        attractions: pkg.pricing?.attractions,
        total: pkg.pricing?.total,
        budget: pkg.pricing?.budget
      },
      flights: (pkg.flights || []).map(f => {
        const { _id, ...rest } = f;
        return rest;
      }),
      hotels: (pkg.hotels || []).map(h => {
        const { _id, ...rest } = h;
        return {
          ...rest,
          room_id: h.room_id // Guaranteed room_id for section 4 compliance
        };
      }),
      transfers: (pkg.transfers || []).map(t => {
        const { _id, ...rest } = t;
        return rest;
      }),
      attractions: (pkg.attractions || []).map(a => {
        const { _id, ...rest } = a;
        return rest;
      }),
      itinerary: (pkg.itinerary || []).map(day => ({
        date: day.date,
        city: day.city,
        title: day.title,
        events: (day.events || []).map(ev => {
          const { _id, ...rest } = ev;
          return rest;
        })
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="holiday-${pkg.booking?.reference || id}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = {
  generatePackage,
  getPackageById,
  getAlternatives,
  modifyPackage,
  confirmPackage,
  exportPackage
};
