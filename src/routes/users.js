import { Router } from "express";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function clientMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.ip,
    userAgent: req.headers["user-agent"] || "",
  };
}

/* =========================
   USER: Profile (me)
========================= */

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  const u = await User.findById(req.user.id).select("-passwordHash");
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json(u);
});

// PATCH /api/users/me  (name, phone, email)
router.patch("/me", requireAuth, async (req, res) => {
  const { name, phone, email } = req.body;

  const u = await User.findById(req.user.id);
  if (!u) return res.status(404).json({ error: "User not found" });

  const before = { name: u.name, email: u.email, phone: u.phone };

  if (typeof name === "string") u.name = name.trim();
  if (typeof phone === "string") u.phone = phone.trim();

  if (typeof email === "string") {
    const newEmail = email.trim().toLowerCase();
    if (newEmail !== u.email) {
      const exists = await User.findOne({ email: newEmail });
      if (exists) return res.status(409).json({ error: "Email already used" });
      u.email = newEmail;
    }
  }

  await u.save();

  const after = { name: u.name, email: u.email, phone: u.phone };
  const meta = clientMeta(req);

  await AuditLog.create({
    actorId: req.user.id,
    targetUserId: u._id,
    action: "PROFILE_UPDATE",
    before,
    after,
    ...meta,
  });

  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });
});

// PATCH /api/users/me/password
router.patch("/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "currentPassword and newPassword required" });

  if (String(newPassword).length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const u = await User.findById(req.user.id);
  if (!u) return res.status(404).json({ error: "User not found" });

  const ok = await u.checkPassword(currentPassword);
  if (!ok) return res.status(401).json({ error: "Current password incorrect" });

  u.passwordHash = await User.hashPassword(newPassword);
  await u.save();

  const meta = clientMeta(req);
  await AuditLog.create({
    actorId: req.user.id,
    targetUserId: u._id,
    action: "PASSWORD_CHANGE",
    before: {},
    after: {},
    ...meta,
  });

  res.json({ ok: true });
});

/* =========================
   ADMIN: Users CRUD (US5)
========================= */

// GET /api/users  (admin list)
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

// POST /api/users (admin create)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ error: "Email already used" });

  const finalRole = ["admin", "user", "supervisor"].includes(role) ? role : "user";
  const passwordHash = await User.hashPassword(password);

  const u = await User.create({
    name: name || String(email).split("@")[0],
    email: String(email).toLowerCase(),
    passwordHash,
    role: finalRole,
    phone: phone || "",
  });

  const meta = clientMeta(req);
  await AuditLog.create({
    actorId: req.user.id,
    targetUserId: u._id,
    action: "ADMIN_USER_CREATE",
    before: {},
    after: { name: u.name, email: u.email, role: u.role, phone: u.phone },
    ...meta,
  });

  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });
});

// PUT /api/users/:id (admin update)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, role, phone } = req.body;

  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "Not found" });

  const before = { name: u.name, email: u.email, role: u.role, phone: u.phone };

  if (typeof name === "string") u.name = name.trim();
  if (typeof phone === "string") u.phone = phone.trim();

  if (typeof role === "string" && ["admin", "user", "supervisor"].includes(role)) u.role = role;

  if (typeof email === "string") {
    const newEmail = email.trim().toLowerCase();
    if (newEmail !== u.email) {
      const exists = await User.findOne({ email: newEmail });
      if (exists) return res.status(409).json({ error: "Email already used" });
      u.email = newEmail;
    }
  }

  await u.save();

  const after = { name: u.name, email: u.email, role: u.role, phone: u.phone };

  const meta = clientMeta(req);
  await AuditLog.create({
    actorId: req.user.id,
    targetUserId: u._id,
    action: "ADMIN_USER_UPDATE",
    before,
    after,
    ...meta,
  });

  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt });
});

// DELETE /api/users/:id (admin delete)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "Not found" });

  await User.findByIdAndDelete(req.params.id);

  const meta = clientMeta(req);
  await AuditLog.create({
    actorId: req.user.id,
    targetUserId: u._id,
    action: "ADMIN_USER_DELETE",
    before: { name: u.name, email: u.email, role: u.role, phone: u.phone },
    after: {},
    ...meta,
  });

  res.json({ ok: true });
});

export default router;
