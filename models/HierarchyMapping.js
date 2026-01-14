const mongoose = require("mongoose");
const { Schema } = mongoose;

const hierarchyMappingSchema = new Schema(
  {
    sl: { type: String, trim: true },
    slEmail: { type: String, trim: true, lowercase: true, index: true },

    zonal: { type: String, trim: true },
    zonalEmail: { type: String, trim: true, lowercase: true, index: true },

    acm: { type: String, trim: true },
    acmEmail: { type: String, trim: true, lowercase: true, index: true },

    pc: { type: String, trim: true },
    constituency: { type: String, trim: true },        // example: "154-Magathane"
    ward: { type: String, trim: true },    // example: "12"
  },
  { timestamps: true }
);

// Helpful compound index for fast filters
hierarchyMappingSchema.index({ constituency: 1, ward: 1 });
hierarchyMappingSchema.index({ pc: 1, constituency: 1, ward: 1 });

module.exports = mongoose.model("HierarchyMapping", hierarchyMappingSchema);
