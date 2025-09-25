import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../src/db.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function upsertUser(email, name, role, plainPassword) {
    const userId = uuidv4();
    const hash = await bcrypt.hash(plainPassword, 10);

    await pool.execute(
        `INSERT INTO users (user_id, email, password_hash, name, role)
     VALUES (:userId, :email, :hash, :name, :role)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
        { userId, email, hash, name, role }
    );

    const [[user]] = await pool.query(
        `SELECT user_id FROM users WHERE email = :email LIMIT 1`, { email }
    );
    return user.user_id;
}

async function main() {
    const bossId = await upsertUser('boss@example.com', 'Boss', 'boss', 'bosspass');
    const mgrId  = await upsertUser('manager@example.com', 'Manager', 'manager', 'managerpass');
    const s1Id   = await upsertUser('staff1@example.com', 'Alice', 'employee', 'staffpass1');
    const s2Id   = await upsertUser('staff2@example.com', 'Bob', 'employee', 'staffpass2');

    // 创建一个 09:00-17:00 的班次
    const shiftId = uuidv4();
    await pool.execute(
        `INSERT IGNORE INTO shifts (shift_id, date, start_time, end_time, location, position, notes, created_by)
     VALUES (:shiftId, :date, :start, :end, :loc, :pos, :notes, :creator)`,
        {
            shiftId, date: '2025-09-22', start: '09:00', end: '17:00',
            loc: 'Depot A', pos: 'Driver', notes: null, creator: bossId
        }
    );

    // 把两个员工分配到这个班次
    const a1 = uuidv4(), a2 = uuidv4();
    await pool.execute(
        `INSERT IGNORE INTO assignments (assignment_id, user_id, shift_id)
     VALUES (:a1, :s1, :shift), (:a2, :s2, :shift)`,
        { a1, s1: s1Id, shift: shiftId, a2, s2: s2Id }
    );

    console.log('Seed done.');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
