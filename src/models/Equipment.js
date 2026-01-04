import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    status: String,
    location: String,
    capacity: Number,

    //  حقل الكمية الجديدة
    quantity: { type: Number, required: true, default: 1 },

    photoUrl: String,
    imageFile: String,
  },
  { timestamps: true }
);

export default mongoose.model("Equipment", equipmentSchema);
