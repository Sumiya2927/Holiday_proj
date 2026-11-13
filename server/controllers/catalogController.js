
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

module.exports = { getCatalog };
