// ljholding_backend_manage_server.js
// Minimal internal management API (no login, no auth) for Node 18.20.8

// Management API mounted under path prefix: /ljholding_backend_management
// 管理端 API，统一挂载到 /ljholding_backend_management 前缀

const express = require("express");
const cors = require("cors");
const { pools } = require("./database");
const Orders = require("./controllerAPI/orders");//用于订单管理
const Quotes = require("./controllerAPI/quotes");//用于管理路线的预估报价相关
const Users = require("./controllerAPI/users");//用于账户登录/鉴权/管理
const { verifyToken } = require("./middleware/auth"); // [NEW] JWT 校验中间件

const app = express();
const r = express.Router(); // ← 用 Router 明确挂载前缀
// 你问的是 用 app 直接挂所有路由 和 用 Router r 然后统一挂载到前缀 各自的好处和坏处。

// 🅰️ 全部用 app（你现在的写法）
// app.get("/ljholding_backend_management/api/quotes/vehicle-types", Quotes.listVehicleTypes);

// ✅ 好处

// 简单直观：一眼能看出完整路径，不用再跳到别处找前缀。

// 少一层抽象：新手或小团队容易理解和维护。

// 快速验证：浏览器或 Postman 拷贝 URL 就能直接对应代码里的路径。

// ❌ 坏处

// 重复代码：所有路由都要手动写前缀（/ljholding_backend_management/...），一旦前缀要改，所有地方都要改。

// 难以模块化：如果以后你想把 Quotes / Orders 拆成独立模块导出 router，这种写法扩展性较差。

// 不利于测试：测试时不能轻松挂不同 basePath。

// 🅱️ 用 Router r，统一挂载前缀
// const r = express.Router();
// r.get("/api/quotes/vehicle-types", Quotes.listVehicleTypes);
// app.use("/ljholding_backend_management", r);

// ✅ 好处

// 统一前缀管理：前缀只写一次，改动时只动一行代码。

// 更清晰的模块化：Quotes, Orders, Users 可以各自一个 router 文件，主入口只负责 app.use("/xxx", router).

// 更贴近生产实践：大项目里大家更熟悉这种挂载方式。

// 测试更方便：可以在测试环境挂不同前缀，甚至挂多个版本（/v1, /v2）。

// ❌ 坏处

// 初学者不直观：看代码时需要脑补前缀，不能直接从一行代码看到完整路径。

// 多一层间接性：调试时，如果不加日志，有人会搞不清为什么 URL 要带 /ljholding_backend_management 才能访问。

// 我推荐哪个？🤔

// 如果这是长期要维护的项目（多模块、多开发者参与，未来可能扩展更多 API） 👉 推荐用 Router。

// 因为扩展性、可维护性、改前缀都更方便。

// 你现在已经有 orders + quotes 两大块，很适合用 Router 模块化。

// 如果只是个人学习/小实验，不会频繁改动路径 👉 用 app 就好。

// 简单，写出来就能跑，不用多想。

// 📌 我的建议：
// 既然你已经在做完整的管理端/报价端/跟踪端，而且数据库和 API 都在扩展，最好切换到 Router 模式，这样以后维护起来省心。
const PORT = process.env.PORT || 4010;

// ---------- Auth ----------
// 登录（公开）—— 前端先拿到 token，后续请求带 Authorization: Bearer <token>
r.post("/api/login", Users.login); // [NEW]公开

app.use(cors());
app.use(express.json());

// ---- request logger (排查路径用) ----
//作用 / Purpose
// 每当有请求进来时，在控制台打印出请求方法和路径。
// 方便调试 404 或路径写错的情况。
// 例如访问
// GET /ljholding_backend_management/api/quotes/vehicle-types
// 控制台会打印：
//INCOMING: GET /ljholding_backend_management/api/quotes/vehicle-types
app.use((req, _res, next) => {
  console.log("INCOMING:", req.method, req.originalUrl);
  next();
});

// ---------- Health/ 存活探针 - ----------
// 既能访问：
// https://.../ljholding_backend_management/health
// 也能访问：
// https://.../health

// 什么时候需要
// 如果你的部署环境/负载均衡器只能访问根路径 /health，就需要这个“简短版”。
// 如果只是自己测试，可以保留 /ljholding_backend_management/health 就够了。

// 📌 总结
// request logger：调试时看清实际 URL。

// /ljholding_backend_management/health：带前缀，保证和 API 一致。

// /health：快捷方式，有些监控工具只认根路径，可以保留。

    // 我可以在代码里面同时使用app.get 和r.get吗？就像我现在这样
    // ChatGPT said:
    // 可以在一份 Express 应用里同时使用 app.get(...) 和 r.get(...)，但要理解它们的区别 👇

    // 🟢 app.get(...)
    // 直接把路由挂到 顶层应用对象 app 上。
    // 代码写的是什么路径，就会直接匹配那个路径。
    // 例子：
    // app.get("/health", (req,res)=> res.json({ok:true}));
    // 访问路径就是 /health。

    // 🟢 r.get(...)
    // 先创建一个 Router 实例：
    // const r = express.Router();
    // 在 r 上定义路由：
    // r.get("/api/orders", Orders.listOrders);
    // 然后把整个 r 挂到某个前缀：
    // app.use("/ljholding_backend_management", r);
    // 最终访问路径是：
    // /ljholding_backend_management/api/orders

    // ✅ 可以同时用

//你完全可以在同一个项目里同时用 app.get(...) 和 r.get(...)，它们会互不干扰。
  // 我有可能保留现在的这2个health吗？如果保留，我需要使用哪个网址来查询，我希望在这2个health的基础上再添加一个 r.get开头的health
  // ChatGPT said:
  // 可以的 ✅
  // 你现在代码里已经有两个 health 路由：
  // 带前缀版
  // app.get("/ljholding_backend_management/health", (req, res) =>
  //   res.json({ ok: true, msg: "management API up" })
  // );
  // 👉 访问：
  // https://你的域名/ljholding_backend_management/health

  // 全局简短版
  // app.get("/health", (req,res)=> res.json({ ok:true, msg: "management API up" }));
  // 👉 访问：
  // https://你的域名/health

  // 如果你想再加一个 r.get 的 health
  // 完全可以。做法是：

  // const r = express.Router();
  // // 在 router 里加一个 health
  // r.get("/health", (req, res) =>
  //   res.json({ ok: true, msg: "management API (router) up" })
  // );
  // // 把 router 挂到前缀
  // app.use("/ljholding_backend_management", r);
  // 👉 挂载后访问路径就是：
  // https://你的域名/ljholding_backend_management/health

  // ⚠️ 注意
  // 你现在已经有 app.get("/ljholding_backend_management/health")，如果再加一个 r.get("/health")，它们访问的路径其实是一样的（都会落在 /ljholding_backend_management/health）。
  // Express 遇到相同路径的多个路由时，会按声明顺序匹配，先声明的会先执行。
  // 📌 总结
  // 保留现在两个 app.get 没问题，推荐保留 /health（方便监控工具探针用）。
  // 如果你想练习用 r.get，可以加一个，但最好让它返回不同的 msg，这样你能区分到底命中了哪个路由。
//

app.get("/health", (req,res)=>    // ---------- Health (app.get 全局版)----------// 全局健康检查 无效，先忽略
  res.json({ ok:true, msg: "global health (app.get)" })
// https://24081092.it.scu.edu.au/health
// <!DOCTYPE html>
// <html lang="en">

// <head>
// 	<meta charset="utf-8">
// 	<title>Error</title>
// </head>

// <body>
// 	<pre>Cannot GET /health</pre>
// </body>

// </html>
//app.get("/health"   GET https://24081092.it.scu.edu.au/health, Cannot GET /health
);

// app.get("/ljholding_backend_management/health", (req, res) =>          // 带前缀的健康检查 (直接 app.get)
//   res.json({ ok: true, msg: "management API up（app.get）" })
// //https://24081092.it.scu.edu.au/ljholding_backend_management/health
// // {
// //     "ok": true,
// //     "msg": "management API up（app.get）"
// // }
// );

// ---------- Health (r.get 版，挂在 /api/health) ----------
  // 现在你有 3 个健康接口

  // 全局 health：
  // GET https://你的域名/health
  // 返回: { ok: true, msg: "global health (app.get)" }

  // 带前缀（直接 app.get）：
  // GET https://你的域名/ljholding_backend_management/health
  // 返回: { ok: true, msg: "management API health (app.get)" }

  // 带前缀（router r.get）：
  // GET https://你的域名/ljholding_backend_management/health
  // 返回: { ok: true, msg: "management API health (r.get)" }

  // ⚠️ 因为 2 和 3 的路径完全一样，Express 会按定义顺序来匹配。上面代码里 2 在前、3 在后 → 所以访问 /ljholding_backend_management/health 时，默认先命中 app.get。
  // 如果你想测试 router 版，可以临时把 app.get("/ljholding_backend_management/health", ...) 那个注释掉。
    // 要不要我帮你把 router 版 health 的路径改成 /api/health，这样就能和 app.get 的不冲突，同时三种 health 都能共存？

r.get("/api/health", (req,res)=> // Router 下的健康检查, 原来是r.get("/health", 目前唯一可用health探针
// r.get("/health", (req,res)=> 
//   res.json({ ok:true, msg: "management API health (r.get;/ljholding_backend_management/helth)" })
// );
  res.json({ ok:true, msg: "management API health (r.get;/ljholding_backend_management/api/health)" })
    //https://24081092.it.scu.edu.au/ljholding_backend_management/api/health
    // {
    // "ok": true,
    // "msg": "management API health (r.get)"
    // } 
);
// // Router 下的健康检查 目前被注释掉了无法使用
// r.get("/health", (req,res)=> 
//   res.json({ ok:true, msg: "management API health (r.get)" })
// // GET https://24081092.it.scu.edu.au/ljholding_backend_management/health
// // {
// //     "ok": true,
// //     "msg": "management API health (r.get)"
// // }运行成功
// );

// ---------- Root Path Description ----------
// 访问根路径时显示提示信息

app.get("/ljholding_backend_management", (req, res) => { // ---------- Root Path Description ----------  // 访问根路径时显示提示信息
  res.send(
    "write by lee in ljholding_backend_manage_server; server is running. " +
    "Try /ljholding_backend_manaalth or /ljholding_backend_management/api/orders"
  );
});


// ---------- 登录校验分界线 ----------
// 从这里往下的路由都会先经过 verifyToken()，未登录直接 401
r.use(verifyToken); // [NEW]r.use(verifyToken);                 // 下面的受保护

// ---------- Orders ----------

// app.get("/api/orders", Orders.listOrders);
// app.get("/api/meta/transfer-status-options", Orders.getTransferStatusOptions);
// app.put("/api/items/:itemId/transfer_status", Orders.updateItemStatus);
r.get("/api/orders", Orders.listOrders);
r.get("/api/meta/transfer-status-options", Orders.getTransferStatusOptions);
r.put("/api/items/:itemId/transfer_status", Orders.updateItemStatus);

// quotes

// app.get("/api/quotes/locations", Quotes.listLocations);
// app.get("/api/quotes/vehicle-types", Quotes.listVehicleTypes);
// app.get("/api/quotes/route-prices", Quotes.listRoutePrices);
// app.post("/api/quotes/route-prices", Quotes.upsertRoutePrice);
r.get("/api/quotes/locations", Quotes.listLocations);
r.get("/api/quotes/vehicle-types", Quotes.listVehicleTypes);
r.get("/api/quotes/route-prices", Quotes.listRoutePrices);
r.post("/api/quotes/route-prices", Quotes.upsertRoutePrice);
r.put("/api/quotes/route-prices/price", Quotes.updateRoutePrice);
r.put("/api/quotes/route-prices/backload", Quotes.updateBackload);
r.post("/api/quotes/locations", Quotes.createLocation);
r.put("/api/quotes/locations", Quotes.updateLocation);

// users
r.post("/api/users", Users.createUser);
r.delete("/api/users/:id", Users.deleteUser);
r.put("/api/users/:id/status", Users.updateStatus);
r.put("/api/users/:id/password", Users.resetPassword);
r.get("/api/users", Users.listUsers);
r.get("/api/users/:id", Users.getUser);


// ---------- Mount router under base path ----------
// 把上面的所有路由统一挂到前缀下

  //app.use("/ljholding_backend_management", r);
  // 👉 它的作用是：把你通过 r.get(...) / r.post(...) 定义的所有路由，统一挂载到 /ljholding_backend_management 前缀下。
  // 📌 放置位置
  // 通常放在 所有 r.get / r.post 都定义完之后，但在 app.listen(...) 启动服务之前。
  // 📌 结论：
  // 👉 放在 graceful shutdown 前面，app.listen 前面。
  // 这样就能保证：
  // 所有路由都已经挂载完成
  // shutdown 和 listen 是最后执行的逻辑
//   统一前缀管理
// 所有 r.get / r.post 定义的路由都统一通过
// app.use("/ljholding_backend_management", r);
// 掛载在 /ljholding_backend_management 下。
// 这样以后要改前缀，只要改这里一行。
app.use("/ljholding_backend_management", r);

// graceful shutdown

// 监听退出信号

// process.on("SIGINT", shutdown); → 当你按 Ctrl + C 停止 Node 进程时触发。

// process.on("SIGTERM", shutdown); → 当服务器（例如 cPanel、Passenger、PM2、Docker）要停止进程时触发。

// 关闭数据库连接池

// 你的服务里用 mysql2/promise 创建了多个连接池（orders、quotes）。

// 如果不关闭，进程直接 exit 可能留下未释放的连接。

// 这段代码会遍历所有 pools，调用 .end() 关闭连接池。

// 退出进程

// 数据库连接池都关闭后，调用 process.exit(0) 正常退出。

// ✅ 为什么要有它

// 防止连接泄露：没有优雅关闭，进程退出时数据库连接可能留在 sleep 状态。
// 更干净的重启：在 cPanel/Passenger 或 Docker 里，进程会定期重启，有了优雅关闭，能避免数据库占满连接数。
// 生产环境标准做法：很多 Node 服务都会监听 SIGINT / SIGTERM 来清理资源。

// 🔎 举例：
// 如果你没这段代码，手动重启 10 次应用，MySQL 里可能会看到 10 个 sleep 连接没释放。
// 有了它，重启时都会主动 end() 连接池，MySQL 保持干净。
function shutdown(){
  Promise.all(Object.values(pools).map(p=>p.end().catch(()=>{}))).finally(()=>process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen(PORT, ()=> console.log(`management API listening on :${PORT}`));
