import { Router } from "express";
import Reservation from "../models/Reservation.js";
import Equipment from "../models/Equipment.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// ✅ helper: always return populated reservation (user + equipment names)
async function populateReservation(id) {
  return Reservation.findById(id)
    .populate("userId", "name email")
    .populate("equipmentId", "name");
}

// GET /api/reservations/calendar/all
router.get("/calendar/all", requireAuth, async (req, res) => {
  const items = await Reservation.find()
    .populate("userId", "name email")
    .populate("equipmentId", "name")
    .sort({ start: 1 });

  res.json(items);
});

router.get("/", requireAuth, async (req, res) => {
  const items = await Reservation.find({ userId: req.user.id }).sort({ start: -1 });
  res.json(items);
});

// GET admin list with filters
router.get("/admin", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
  const { status, userId, equipmentId, date } = req.query;
  const q = {};

  if (status) q.status = status;
  if (userId) q.userId = userId;
  if (equipmentId) q.equipmentId = equipmentId;

  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    q.start = { $gte: d, $lt: next };
  }

  const items = await Reservation.find(q)
    .populate("userId", "name email")
    .populate("equipmentId", "name")
    .sort({ start: -1 });

  res.json(items);
});

// PUT /reservations/:id  (edit)
router.put("/:id", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });

  const { start, end, status, reason } = req.body;
  if (start) r.start = new Date(start);
  if (end) r.end = new Date(end);
  if (status) r.status = status;
  r.reason = reason || r.reason;

  await r.save();

  // ✅ return populated (so UI shows names not IDs)
  const populated = await populateReservation(r._id);
  res.json(populated);
});

// DELETE /reservations/:id
router.delete("/:id", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  await r.deleteOne();
  res.json({ ok: true });
});

// -----------------------------------------------
// POST /reservations
// -----------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  try {
    const { equipmentId, start, end, reason } = req.body;

    // get equipment to know quantity
    const eq = await Equipment.findById(equipmentId);
    if (!eq) return res.status(404).json({ error: "Équipement introuvable." });

    const s = new Date(start);
    const e = new Date(end);

    // overlapping pending/approved
    const overlapping = await Reservation.find({
      equipmentId,
      status: { $in: ["pending", "approved"] },
      start: { $lt: e },
      end: { $gt: s },
    });

    const qty = Math.max(1, Number(eq.quantity ?? 1));

    if (overlapping.length >= qty) {
      return res.status(400).json({
        error: `Nombre maximal réservé (${qty}) atteint pour ce créneau.`,
      });
    }

    // create reservation
    const reservation = await Reservation.create({
      userId: req.user.id,
      equipmentId,
      start: s,
      end: e,
      reason,
      status: "pending",
    });

    // ✅ return populated
    const populated = await populateReservation(reservation._id);
    res.json(populated);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// CANCEL
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });

  if (String(r.userId) !== String(req.user.id) && req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  r.status = "cancelled";
  await r.save();

  // ✅ return populated
  const populated = await populateReservation(r._id);
  res.json(populated);
});

// APPROVE
router.patch("/:id/approve", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });

  const eq = await Equipment.findById(r.equipmentId);
  if (!eq) return res.status(404).json({ error: "Équipement introuvable." });

  const s = new Date(r.start);
  const e = new Date(r.end);

  // only approved overlapping
  const overlappingApproved = await Reservation.find({
    equipmentId: r.equipmentId,
    status: "approved",
    _id: { $ne: r._id },
    start: { $lt: e },
    end: { $gt: s },
  });

  const qty = Math.max(1, Number(eq.quantity ?? 1));

  if (overlappingApproved.length >= qty) {
    return res.status(409).json({
      error: `Impossible d'approuver: quantité max (${qty}) atteinte pour ce créneau.`,
    });
  }

  r.status = "approved";
  await r.save();

  // ✅ return populated
  const populated = await populateReservation(r._id);
  res.json(populated);
});

// REJECT
router.patch("/:id/reject", requireAuth, requireRole("admin", "supervisor"), async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });

  r.status = "rejected";
  await r.save();

  // ✅ return populated
  const populated = await populateReservation(r._id);
  res.json(populated);
});

export default router;
