const mongoose = require("mongoose");

const interventionDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pc: { type: String, trim: true },
    constituency: { type: String, required: [true, "Please select a Constituency"], trim: true },
    ward: { type: String, trim: true },
    booth: { type: String, trim: true },

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

module.exports = mongoose.model("interventionData", interventionDataSchema);
