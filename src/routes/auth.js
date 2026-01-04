import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

// quick debug route
router.get('/_debug', (req, res) => res.json({ ok: true, scope: 'auth' }));

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body; // ✅ أضفنا phone
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const passwordHash = await User.hashPassword(password);
    const finalRole = ['admin','user','supervisor'].includes(role) ? role : 'user';

    const user = await User.create({
      name: name || email.split('@')[0],
      email,
      passwordHash,
      role: finalRole,
      phone, // ✅ حفظ رقم الهاتف
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone, 
      },
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const bcryptOk = await user.checkPassword(password);
  if (!bcryptOk) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
  token,
  user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone }});
});

export default router;
    