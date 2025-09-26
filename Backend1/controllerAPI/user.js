// controllerAPI/users.js
const { getPool } = require("../database");

//const bcrypt = require("bcrypt");
const bcrypt = require("bcryptjs"); 
//bcryptjs 是纯 JS，无需编译工具链；与 bcrypt 生成/验证的哈希格式兼容（$2a/$2b/...）。

//const jwt = require("jsonwebtoken");           // 如果你要发 token
//const JWT_SECRET = process.env.JWT_SECRET || "change_me"; // 记得上线改环境变量
const { signToken } = require("../middleware/auth"); // [NEW] 统一用 signToken() //删掉 JWT_SECRET 那行，改为引入 signToken。其他代码保持

// 工具函数：校验用户组&状态
function validGroup(g){ return ["superadmin","staff"].includes(g); }
function validStatus(s){ return ["active","inactive"].includes(s); }

/**
 * POST /api/users
 * body: { user_name, password, user_group, email, real_name?, status? }
 */
async function createUser(req, res){
  const { user_name, password, user_group, email, real_name=null, status="active" } = req.body || {};
  if(!user_name || !password || !user_group || !email){
    return res.status(400).json({ ok:false, error: "user_name, password, user_group, email are required" });
  }
  if(!validGroup(user_group)) return res.status(400).json({ ok:false, error: "user_group must be 'superadmin' or 'staff'" });
  if(!validStatus(status)) return res.status(400).json({ ok:false, error: "status must be 'active' or 'inactive'" });

  try{
    const hash = await bcrypt.hash(password, 10);//
//                                     这里的 10 是“salt rounds”（成本因子）。
// bcrypt 会自动：
// 生成随机盐（salt）
// 结合明文密码 + 盐做多轮哈希
// 返回一个形如 "$2b$10$..." 的不可逆字符串

// 存储到数据库的是这个哈希值，不是明文。比如你插入 123456，最终 DB 里可能长这样（示例）：
// $2b$10$2s3Vg0v2aO9x9dWmWv4ykuH9w0k4y8bU8mWl0v7bHq0Y2W0eHkK9y

// 这个哈希里已经包含了盐与成本信息，因此不需要单独存盐字段。

// 明文“123456”会如何被存、如何被读取？
// 不会存明文 123456。只存上面那串哈希。
// 读出时，你拿到的也只会是哈希串（没有办法“解密”拿回明文，因为这是不可逆哈希，不是对称加密）。

// 登录时如何验证？
// 前端把 user_name/email + 明文 password 发给后端（HTTPS）。
// 后端根据用户名/邮箱查询出该用户的一行记录，取出 user_password（哈希）。
// 用 bcrypt.compare(明文, 哈希) 来判定密码是否正确。
//

    const conn = await getPool("orders").getConnection(); // users 表在 car_transport2 库
    try{
      const [result] = await conn.query(
        "INSERT INTO users (user_name, user_password, user_group, real_name, email, status) VALUES (?, ?, ?, ?, ?, ?)",
        [user_name, hash, user_group, real_name, email, status]
      );
      res.json({ ok:true, user_id: result.insertId });
    }catch(e){
      // 若你的 email 上有唯一约束，会抛 ER_DUP_ENTRY
      if(e && e.code === "ER_DUP_ENTRY"){
        return res.status(409).json({ ok:false, error: "email already exists" });
      }
      throw e;
    }finally{
      conn.release();
    }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/**
 * DELETE /api/users/:id
 */
async function deleteUser(req, res){
  const userId = Number(req.params.id);
  if(!userId) return res.status(400).json({ ok:false, error: "userId required" });

  try{
    const conn = await getPool("orders").getConnection();
    try{
      // 保护：不允许删除系统里最后一个 superadmin（可选安全措施）
      const [[sa]] = await conn.query("SELECT COUNT(*) AS c FROM users WHERE user_group='superadmin'");
      const [[tgt]] = await conn.query("SELECT user_group FROM users WHERE user_id=?", [userId]);
      if(!tgt) return res.status(404).json({ ok:false, error: "user not found" });
      if(tgt.user_group === "superadmin" && sa.c <= 1){
        return res.status(400).json({ ok:false, error: "cannot delete the last superadmin" });
      }

      const [r] = await conn.query("DELETE FROM users WHERE user_id=?", [userId]);
      res.json({ ok:true, affectedRows: r.affectedRows });
    }finally{
      conn.release();
    }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// 登录：POST /api/auth/login  { login, password }  // login 可填 user_name 或 email
/*我实在搞不清这边怎么写了，直接复制chatgpt，把被注释的代码的替换了下面的代码
async function login(req, res){
  const { login, password } = req.body || {};
  if(!login || !password) return res.status(400).json({ ok:false, error:"login and password are required" });

  try{
    const conn = await getPool("orders").getConnection();//users表在jli89_car_transport2这个数据库里面
    try{
      // const [rows] = await conn.query(
      //   "SELECT user_id, user_name, email, user_password, user_group, real_name, status FROM users WHERE user_name=? OR email=? LIMIT 1",
      //   [login, login]
      // );
      // if(rows.length === 0) return res.status(401).json({ ok:false, error:"invalid credentials" });

      // const u = rows[0];
      const [[u]] = await conn.query(      // 双重解构直接取第一行
        "SELECT user_id, user_name, email, user_password, user_group, real_name, status \
         FROM users WHERE user_name=? OR email=? LIMIT 1",
        [login, login]
      );
      if(!u) return res.status(401).json({ ok:false, error:"invalid credentials" });
//
      if(u.status === "inactive") return res.status(403).json({ ok:false, error:"account inactive" });

      const ok = await bcrypt.compare(password, u.user_password);
      if(!ok) return res.status(401).json({ ok:false, error:"invalid credentials" });

      // // 颁发 JWT（可选）
      // const token = jwt.sign({ uid: u.user_id, role: u.user_group }, JWT_SECRET, { expiresIn: "2h" });
      
      // 颁发 12h JWT
      const { signToken } = require("../middleware/auth");   // [NEW] 引入
      const token = signToken({ uid: u.user_id, role: u.user_group }); // 12h 有效

      delete u.user_password;
      // res.json({ ok:true, token, user: u });
      res.json({ ok:true, token, expires_in: 60*60*12, user: u });
    } finally { conn.release(); }
  }catch(err){ res.status(500).json({ ok:false, error: err.message }); }
}
*/

async function login(req, res) {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "login and password are required" });
  }

  try {
    // users 表在 jli89_car_transport2 数据库
    const conn = await getPool("orders").getConnection();
    try {
      // ① 查询首行用户数据
      const [[u]] = await conn.query(
        `SELECT user_id, user_name, email, user_password, user_group,
                real_name, status
           FROM users
          WHERE user_name = ? OR email = ?
          LIMIT 1`,
        [login, login]
      );
      if (!u)
        return res.status(401).json({ ok: false, error: "invalid credentials" });

      // ② 账号状态检查
      if (u.status === "inactive")
        return res
          .status(403)
          .json({ ok: false, error: "account inactive" });

      // ③ 明文密码 VS 哈希
      const ok = await bcrypt.compare(password, u.user_password);
      if (!ok)
        return res.status(401).json({ ok: false, error: "invalid credentials" });

      // ④ 颁发 12 h JWT
      const { signToken } = require("../middleware/auth"); // 引入统一签发器
      const token = signToken({ uid: u.user_id, role: u.user_group }); // 12 h 有效

      delete u.user_password; // 不泄露哈希
      res.json({
        ok: true,
        token,
        expires_in: 60 * 60 * 12, // 前端可用秒数
        user: u
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}


/**
 * PUT /api/users/:id/status    body: { status }
 */
async function updateStatus(req, res){
  const userId = Number(req.params.id);
  const { status } = req.body || {};
  if(!userId || !status) return res.status(400).json({ ok:false, error: "userId and status are required" });
  if(!validStatus(status)) return res.status(400).json({ ok:false, error: "status must be 'active' or 'inactive'" });

  try{
    const conn = await getPool("orders").getConnection();
    try{
      const [r] = await conn.query("UPDATE users SET status=? WHERE user_id=?", [status, userId]);
      res.json({ ok:true, affectedRows: r.affectedRows });
    }finally{ conn.release(); }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

/**
 * PUT /api/users/:id/password  body: { password }
 */
async function resetPassword(req, res){
  const userId = Number(req.params.id);
  const { password } = req.body || {};
  if(!userId || !password) return res.status(400).json({ ok:false, error: "userId and password are required" });

  try{
    const hash = await bcrypt.hash(password, 10);
    const conn = await getPool("orders").getConnection();
    try{
      const [r] = await conn.query("UPDATE users SET user_password=? WHERE user_id=?", [hash, userId]);
      res.json({ ok:true, affectedRows: r.affectedRows });
    }finally{ conn.release(); }
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
}

// GET /api/users
async function listUsers(req, res) {
  try {
    const conn = await getPool("orders").getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT user_id, user_name, user_group, real_name, email, status FROM users ORDER BY user_id ASC"
      );
      res.json({ ok: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// GET /api/users/:id
async function getUser(req, res) {
  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }
  try {
    const conn = await getPool("orders").getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT user_id, user_name, user_group, real_name, email, status FROM users WHERE user_id=?",
        [userId]
      );
      if (rows.length === 0) return res.status(404).json({ ok: false, error: "user not found" });
      res.json({ ok: true, data: rows[0] });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// 导出模块 / Export
module.exports = { 
  createUser, 
  deleteUser, 
  login,
  updateStatus, 
  resetPassword,
  listUsers, 
  getUser 
};
