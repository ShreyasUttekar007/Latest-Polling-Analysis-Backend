const mongoose = require("mongoose");
const { Schema } = mongoose;

const boothSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    zone: {
      type: String,
      required: [true, "Please select a Zone"],
      trim: true,
    },
    pc: {
      type: String,
      required: [true, "Please select a Pc"],
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
    address: {
      type: String,
      required: [true, "Please select a Address"],
      trim: true,
    },
  },
  { timestamps: true }
);

const Booth = mongoose.model("boothmapping", boothSchema);

module.exports = Booth;
