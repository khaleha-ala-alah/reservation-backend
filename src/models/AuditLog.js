import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: {
      type: String,
      enum: [
        "PROFILE_UPDATE",
        "PASSWORD_CHANGE",
        "ADMIN_USER_CREATE",
        "ADMIN_USER_UPDATE",
        "ADMIN_USER_DELETE",
      ],
      required: true,
    },
    before: { type: Object, default: {} },
    after: { type: Object, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
