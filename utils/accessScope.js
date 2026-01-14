// utils/accessScope.js
const Hierarchy = require("../models/HierarchyMapping");

async function getAllowedScopeByEmail(emailRaw) {
  const email = String(emailRaw).toLowerCase().trim();

  const rows = await Hierarchy.find({
    $or: [{ slEmail: email }, { zonalEmail: email }, { acmEmail: email }],
  }).select("pc constituency ward");

  const allowedOr = rows.map(r => ({
    pc: r.pc,
    constituency: r.constituency,
    ward: r.ward,
  }));

  return { allowedOr };
}

module.exports = { getAllowedScopeByEmail };
