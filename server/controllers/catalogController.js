const mongoose = require("mongoose");

const getCatalog = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const [
      destinations,
      airports,
      flights,
      hotels,
      rooms,
      availability,
      transfers,
      attractions
    ] = await Promise.all([
      db.collection("destinations").find({}).toArray(),
      db.collection("airports").find({}).toArray(),
      db.collection("flights").find({}).toArray(),
      db.collection("hotels").find({}).toArray(),
      db.collection("rooms").find({}).toArray(),
      db.collection("availability").find({}).toArray(),
      db.collection("transfers").find({}).toArray(),
      db.collection("attractions").find({}).toArray()
    ]);

    res.status(200).json({
      success: true,
      data: {
        destinations,
        airports,
        flights,
        hotels,
        rooms,
        availability,
        transfers,
        attractions
      }
    });

  } catch (error) {
    console.error("Catalog Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve catalog data"
    });
  }
};

const getOptions = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const destDoc = await db.collection("destinations").findOne({});

    const departure_cities = destDoc?.departure_cities || [
      { airport: 'BLR', city: 'Bengaluru' },
      { airport: 'DEL', city: 'Delhi' },
      { airport: 'BOM', city: 'Mumbai' },
      { airport: 'MAA', city: 'Chennai' }
    ];

    const countries = destDoc?.countries || [
      { code: 'JP', name: 'Japan' },
      { code: 'AE', name: 'United Arab Emirates' }
    ];

    res.status(200).json({
      success: true,
      data: {
        departure_cities,
        countries,
        rules: destDoc?.rules || {}
      }
    });
  } catch (error) {
    console.error("Options Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve options"
    });
  }
};

module.exports = { getCatalog, getOptions };
