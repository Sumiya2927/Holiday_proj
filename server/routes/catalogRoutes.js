const express = require("express");
const router = express.Router();

const { getCatalog, getOptions } = require("../controllers/catalogController");

router.get("/", getCatalog);
router.get("/options", getOptions);

module.exports = router;
