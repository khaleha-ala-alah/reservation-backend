import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','user','supervisor'], default: 'user' },

  // ✅
  phone: { type: String },
}, { timestamps: true });

userSchema.methods.checkPassword = function (pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

userSchema.statics.hashPassword = function (pw) {
  return bcrypt.hash(pw, 10);
};

export default mongoose.model('User', userSchema);
