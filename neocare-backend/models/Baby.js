
const mongoose = require("mongoose");

const babySchema = new mongoose.Schema(
  {
    babyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    babyName: {
      type: String,
      required: true,
      trim: true,
    },

    prematurity: {
      type: String,
      default: "",
    },

    weight: {
      type: Number,
      min: 0,
      default: null,
    },

    admissionTime: {
      type: Date,
      default: Date.now,
    },

    doctor: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    incubatorId: {
      type: String,
      default: null,
    },

    admissionStatus: {
      type: String,
      enum: ["ADMITTED", "DISCHARGED"],
      default: "ADMITTED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Baby", babySchema);
