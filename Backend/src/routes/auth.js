import { Router } from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/login
router.post(
    '/login',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 4 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ code: 'VALIDATION_ERROR', errors: errors.array() });

        const { email, password } = req.body;

        const [rows] = await pool.execute(
            'SELECT user_id, email, password_hash, name, role FROM users WHERE email = :email LIMIT 1',
            { email }
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

        const payload = { sub: user.user_id, email: user.email, name: user.name, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '60m' });

        return res.json({ access_token: token, user: payload });
    }
);

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req, res) => res.json(req.user));

export default router;