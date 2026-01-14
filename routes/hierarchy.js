const express = require("express");
const router = express.Router();
const Hierarchy = require("../models/HierarchyMapping");

router.get("/scope-by-email", async (req, res) => {
  try {
    const emailRaw = req.query.email;
    if (!emailRaw) return res.status(400).json({ error: "email is required" });

    const email = String(emailRaw).toLowerCase().trim();

    // Find rows where this email appears at ANY level
    const rows = await Hierarchy.find({
      $or: [{ slEmail: email }, { zonalEmail: email }, { acmEmail: email }],
    }).select("pc constituency ward slEmail zonalEmail acmEmail");

    if (!rows.length) {
      return res.json({
        level: null,
        allowed: [],
      });
    }

    // Determine user's highest level (priority: SL > Zonal > ACM)
    let level = "ACM";
    if (rows.some((r) => r.slEmail === email)) level = "SL";
    else if (rows.some((r) => r.zonalEmail === email)) level = "ZONAL";

    // allowed scope
    const allowed = rows.map((r) => ({
      pc: r.pc,
      constituency: r.constituency,  // keep naming same as your UI "constituency"
      ward: r.ward,
    }));

    // Deduplicate
    const keySet = new Set();
    const uniqAllowed = [];
    for (const a of allowed) {
      const k = `${a.pc}__${a.constituency}__${a.ward}`;
      if (!keySet.has(k)) {
        keySet.add(k);
        uniqAllowed.push(a);
      }
    }

    res.json({ level, allowed: uniqAllowed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
