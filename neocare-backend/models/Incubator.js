
const mongoose = require("mongoose");

const incubatorSchema = new mongoose.Schema(
  {
    incubatorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    incubatorPower: {
      type: Number,
      default: 1,
    },

    sensorStatus: {
      type: String,
      enum: ["CONNECTED", "DISCONNECTED", "UNKNOWN"],
      default: "UNKNOWN",
    },

    status: {
      type: String,
      enum: ["NORMAL", "WARNING", "CRITICAL", "OFFLINE"],
      default: "OFFLINE",
    },

    currentBabyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Baby",
      default: null,
    },

    incubatorTemp: {
      type: Number,
      default: null,
    },

    babyTemp: {
      type: Number,
      default: null,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incubator", incubatorSchema);
