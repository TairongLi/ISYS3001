// auth-config.js
// JWT 签发相关固定配置 —— 方案 A：全部硬编码
module.exports = {
  jwtSecret: "S3cret@Ljholding",  // ⚠️ 强随机字符串。你可以自行替换
  jwtIssuer: "ljholding-mgmt",
  jwtAudience: "ljholding-admin",
  jwtExpiresIn: "12h"             // 12 小时有效期
};
