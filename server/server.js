const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // also check root if needed

const connectDB = require("./config/db");
const catalogRoutes = require("./routes/catalogRoutes");
const packageRoutes = require("./routes/packageRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/catalog", catalogRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/reservations", reservationRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "Build My Holiday API",
    status: "running",
    version: "1.0.0",
    endpoints: [
      "/api/catalog",
      "/api/catalog/options",
      "/api/packages/generate",
      "/api/packages/:id",
      "/api/packages/:id/confirm",
      "/api/reservations/:reference"
    ]
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
