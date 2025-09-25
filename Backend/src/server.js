import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import rosterRoutes from './routes/roster.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roster', rosterRoutes);

// 404
app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));

// 全局错误处理
app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.status) return res.status(err.status).json({ code: err.code || 'ERROR', message: err.message });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API on http://localhost:${port}/api/v1`));
