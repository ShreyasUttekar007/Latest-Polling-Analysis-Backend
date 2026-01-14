const mongoose = require("mongoose");
const { Schema } = mongoose;

const acSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pc: {
      type: String,
      required: [true, "Please select a PC"],
      trim: true,
    },
    constituency: {
      type: String,
      required: [true, "Please select a Constituency"],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, "Please select a Booth"],
      trim: true,
    },
    priority: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const AcData = mongoose.model("acData", acSchema);

module.exports = AcData;
