import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  reason: String,
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' }
}, { timestamps: true });

reservationSchema.index({ equipmentId: 1, start: 1, end: 1 });

export default mongoose.model('Reservation', reservationSchema);
