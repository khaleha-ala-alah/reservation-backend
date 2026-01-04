import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';


import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipments.js';
import reservationRoutes from './routes/reservations.js';
import userRoutes from "./routes/users.js";


import auditRoutes from "./routes/audit.js";

const app = express();


app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.get('/api/health', (req, res) => res.json({ ok: true }));


app.use('/api/auth', authRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit", auditRoutes);
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log('Server listening on ' + PORT));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
    process.exit(1);
  });
