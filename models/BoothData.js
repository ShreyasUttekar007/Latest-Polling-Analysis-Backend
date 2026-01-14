const mongoose = require("mongoose");
const { Schema } = mongoose;
const AcData = require("../models/AcData");
const Booth = require("./MappingData");

const boothDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    zone: {
      type: String,
      trim: true,
    },
    pc: {
      type: String,
      trim: true,
    },
    constituency: {
      type: String,
      required: [true, "Please select a Constituency"],
      trim: true,
    },
    booth: {
      type: String,
      required: [true, "Please select a Booth"],
      trim: true,
    },
    timeSlot: {
      type: String,
      required: [true, "Please select a timeSlot"],
      trim: true,
    },
    totalVotes: {
      type: String,
      trim: true,
    },
    polledVotes: {
      type: String,
      trim: true,
      default: "",
    },
    favVotes: {
      type: String,
      trim: true,
      default: "",
    },
    ubtVotes: {
      type: String,
      trim: true,
      default: "",
    },
    otherVotes: {
      type: String,
      trim: true,
      default: "",
    },
    boothType: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to fetch and set totalVotes, boothType, and zone
boothDataSchema.pre("save", async function (next) {
  try {
    // Fetch data from AcData
    const acData = await AcData.findOne({ booth: this.booth });
    if (acData) {
      if (acData.totalVotes) this.totalVotes = acData.totalVotes;
      if (acData.boothType) this.boothType = acData.boothType;
      if (acData.zone) this.zone = acData.zone; // Fetch zone
    }

    // Fetch data from Booth for PC
    const pcData = await Booth.findOne({ booth: this.booth });
    if (pcData && pcData.pc) {
      this.pc = pcData.pc;
    }

    next();
  } catch (error) {
    next(error);
  }
});

const BoothData = mongoose.model("boothData", boothDataSchema);

module.exports = BoothData;
