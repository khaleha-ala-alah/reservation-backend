import { Router } from "express";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/audit?limit=50
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actorId", "name email role")
    .populate("targetUserId", "name email role");

  res.json(logs);
});

export default router;
