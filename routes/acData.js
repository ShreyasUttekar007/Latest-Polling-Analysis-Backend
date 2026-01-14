const express = require("express");
const router = express.Router();
const Booth = require("../models/BoothData");
const Ac = require("../models/AcData");
const BoothMapping = require("../models/MappingData");

router.use(express.json());

// -------------------- Create --------------------
router.post("/create-data", async (req, res) => {
  try {
    const booth = new Ac(req.body);
    const savedBooth = await booth.save();
    res.status(201).json(savedBooth);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// -------------------- Read: master lists --------------------

// ✅ Get all PCs
router.get("/get-pcs", async (req, res) => {
  try {
    const pcs = await Ac.distinct("pc");
    pcs.sort((a, b) => a.localeCompare(b));
    res.json(pcs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get constituencies by PC
router.get("/get-constituencies-by-pc/:pc", async (req, res) => {
  try {
    const { pc } = req.params;
    const constituencies = await Ac.distinct("constituency", { pc });
    constituencies.sort((a, b) => a.localeCompare(b));
    res.json(constituencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get wards by PC + constituency
router.get("/get-wards", async (req, res) => {
  try {
    const { pc, constituency } = req.query;
    if (!pc || !constituency) {
      return res.status(400).json({ error: "pc and constituency are required" });
    }

    const wards = await Ac.distinct("ward", { pc, constituency });
    wards.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );

    res.json(wards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-all-wards", async (req, res) => {
  try {
    // Change "ward" to whatever your AcData field is:
    // ward / wardNo / Ward No etc.
    const wards = await Ac.distinct("ward"); // <-- rename if needed
    res.json((wards || []).filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Existing routes --------------------

router.get("/get-ac-data", async (req, res) => {
  try {
    const booths = await Ac.find();
    res.json(booths);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-acdata-by-booth/:boothName", async (req, res) => {
  try {
    const boothName = req.params.boothName;
    const boothData = await Ac.find({ booth: boothName });
    if (boothData.length === 0) {
      return res.status(404).json({ error: "No data found for the specified booth" });
    }
    res.json(boothData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/byBooth/:boothName", async (req, res) => {
  try {
    const boothName = req.params.boothName;
    const boothData = await Booth.findOne({ booth: boothName });
    if (!boothData) {
      return res.status(404).json({ error: "Booth data not found" });
    }
    res.json(boothData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-booth-names-by-constituency/:constituencyName", async (req, res) => {
  try {
    const constituencyName = req.params.constituencyName;
    const booths = await BoothMapping.find(
      { constituency: constituencyName },
      { booth: 1, _id: 0 }
    );
    if (booths.length === 0) {
      return res.status(404).json({ error: "No booths found for the constituency" });
    }
    const boothNames = booths.map((booth) => booth.booth);
    res.json(boothNames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/byConstituency/:constituencyName", async (req, res) => {
  try {
    const constituencyName = req.params.constituencyName;
    const booths = await Booth.find({ constituency: constituencyName });
    if (booths.length === 0) {
      return res.status(404).json({ error: "No booths found for the constituency" });
    }
    res.json(booths);
  } catch (error) {
    console.error("Error getting booths by constituency:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- ⚠️ IMPORTANT: keep this LAST --------------------
router.get("/:id", async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ error: "Booth not found" });
    }
    res.json(booth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
