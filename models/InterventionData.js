const mongoose = require("mongoose");
const AcData = require("../models/AcData"); // adjust path if needed

const interventionDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // AUTO-FILLED from AcData (do NOT ask user in form)
    pc: { type: String, trim: true },
    constituency: { type: String, trim: true },

    // user selects these
    ward: { type: String, trim: true, required: true },
    booth: { type: String, trim: true, required: true },

    interventionType: {
      type: String,
      required: [true, "Please select a Intervention Type"],
      trim: true,
    },
    interventionIssues: { type: String, trim: true },
    interventionIssueBrief: { type: String, trim: true },
    interventionContactFollowUp: { type: String, trim: true },
    interventionAction: { type: String, trim: true, default: "Not Solved" },
  },
  { timestamps: true }
);

// ✅ Pre-save: fill pc + constituency from AcData using booth
interventionDataSchema.pre("save", async function (next) {
  try {
    // Only attempt if ward exists
    if (!this.ward) return next();

    // Find AcData row using ward
    // NOTE: If ward is not unique in AcData, use findOne with a stable rule (like sort)
    const acRow = await AcData.findOne({ ward: this.ward }).lean();

    if (acRow) {
      if (acRow.pc) this.pc = acRow.pc;
      if (acRow.constituency) this.constituency = acRow.constituency;

      // If your AcData uses different field names, map them:
      // this.pc = acRow.PC || acRow.pc
      // this.constituency = acRow.AC || acRow.constituency
    }

    next();
  } catch (err) {
    next(err);
  }
});


module.exports = mongoose.model("interventionData", interventionDataSchema);
