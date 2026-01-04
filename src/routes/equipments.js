import { Router } from "express";
import Equipment from "../models/Equipment.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res) => {
  const items = await Equipment.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const item = await Equipment.create(req.body);
  res.status(201).json(item);
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const updated = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Equipment.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
