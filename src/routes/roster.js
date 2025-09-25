import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRoles } from '../middleware/roles.js';
import { body, query, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { timeToMinutes, overlaps } from '../utils/time.js';

const router = Router();

/** 校验结果统一处理 */
function ensureValid(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', errors: errors.array() });
        return false;
    }
    return true;
}

/** POST /api/v1/roster/shifts  创建班次（boss/manager） */
router.post(
    '/shifts',
    requireAuth, requireRoles('boss', 'manager'),
    body('date').isISO8601({ strict: true }).withMessage('date must be YYYY-MM-DD'),
    body('startTime').matches(/^\d{2}:\d{2}$/),
    body('endTime').matches(/^\d{2}:\d{2}$/),
    body('location').isString().isLength({ min: 1 }),
    async (req, res) => {
        if (!ensureValid(req, res)) return;
        const { date, startTime, endTime, location, position = null, notes = null } = req.body;

        const start = timeToMinutes(startTime);
        const end = timeToMinutes(endTime);
        if (start >= end) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'startTime < endTime required' });

        const shiftId = uuidv4();
        const createdBy = req.user.sub;

        await pool.execute(
            `INSERT INTO shifts (shift_id, date, start_time, end_time, location, position, notes, created_by)
       VALUES (:shiftId, :date, :startTime, :endTime, :location, :position, :notes, :createdBy)`,
            { shiftId, date, startTime, endTime, location, position, notes, createdBy }
        );

        const [rows] = await pool.execute(
            `SELECT shift_id, date, start_time, end_time, location, position, notes
       FROM shifts WHERE shift_id = :shiftId`, { shiftId }
        );
        return res.status(201).json(rows[0]);
    }
);

/** POST /api/v1/roster/assignments  分配员工（boss/manager），含重叠校验 */
router.post(
    '/assignments',
    requireAuth, requireRoles('boss', 'manager'),
    body('userId').isString().isLength({ min: 10 }),
    body('shiftId').isString().isLength({ min: 10 }),
    async (req, res) => {
        if (!ensureValid(req, res)) return;
        const { userId, shiftId } = req.body;

        // 查找班次
        const [[shift]] = await pool.query(
            `SELECT shift_id, date, start_time, end_time FROM shifts WHERE shift_id = :shiftId LIMIT 1`,
            { shiftId }
        );
        if (!shift) return res.status(400).json({ code: 'INVALID_SHIFT', message: 'Shift not found' });

        const newStart = timeToMinutes(shift.start_time);
        const newEnd   = timeToMinutes(shift.end_time);

        // 查找这个员工同一天的已分配班次
        const [rows] = await pool.query(
            `SELECT s.start_time, s.end_time
         FROM assignments a
         JOIN shifts s ON a.shift_id = s.shift_id
        WHERE a.user_id = :userId AND s.date = :date`,
            { userId, date: shift.date }
        );

        const conflict = rows.some(r => overlaps(newStart, newEnd, timeToMinutes(r.start_time), timeToMinutes(r.end_time)));
        if (conflict) return res.status(409).json({ code: 'OVERLAP', message: 'Time overlap with existing assignment' });

        // 插入分配
        const assignmentId = uuidv4();
        await pool.execute(
            `INSERT INTO assignments (assignment_id, user_id, shift_id)
       VALUES (:assignmentId, :userId, :shiftId)`,
            { assignmentId, userId, shiftId }
        );
        return res.status(201).json({ assignmentId, userId, shiftId });
    }
);

/** GET /api/v1/roster?from=YYYY-MM-DD&to=YYYY-MM-DD  查询排班 */
router.get(
    '/',
    requireAuth,
    query('from').isISO8601({ strict: true }),
    query('to').isISO8601({ strict: true }),
    async (req, res) => {
        if (!ensureValid(req, res)) return;
        const { from, to } = req.query;
        const actor = req.user;

        let whereUser = '';
        let params = { from, to };

        if (actor.role === 'employee') {
            whereUser = 'AND a.user_id = :actorId';
            params.actorId = actor.sub;
        } // boss/manager 看全员；后续可扩 teamId 过滤

        const [rows] = await pool.query(
            `SELECT 
          a.assignment_id,
          u.user_id AS employee_id, u.name AS employee_name, u.email AS employee_email,
          s.shift_id, s.date, s.start_time, s.end_time, s.location, s.position, s.notes
        FROM assignments a
        JOIN users u  ON a.user_id = u.user_id
        JOIN shifts s ON a.shift_id = s.shift_id
       WHERE s.date BETWEEN :from AND :to
         ${whereUser}
       ORDER BY s.date ASC, s.start_time ASC`,
            params
        );

        const data = rows.map(r => ({
            assignmentId: r.assignment_id,
            employee: { userId: r.employee_id, name: r.employee_name, email: r.employee_email },
            shift: {
                shiftId: r.shift_id,
                date: r.date, startTime: r.start_time, endTime: r.end_time,
                location: r.location, position: r.position, notes: r.notes
            }
        }));
        return res.json(data);
    }
);

/** DELETE /api/v1/roster/assignments/:id  删除分配（boss/manager） */
router.delete(
    '/assignments/:id',
    requireAuth, requireRoles('boss', 'manager'),
    param('id').isString().isLength({ min: 10 }),
    async (req, res) => {
        if (!ensureValid(req, res)) return;
        const { id } = req.params;
        const [result] = await pool.execute(
            `DELETE FROM assignments WHERE assignment_id = :id`, { id }
        );
        return res.json({ ok: true, affected: result.affectedRows || 0 });
    }
);

export default router;

