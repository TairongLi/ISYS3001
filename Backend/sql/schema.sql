-- 创建数据库（字符集与排序规则）
CREATE DATABASE IF NOT EXISTS employee_scheduler
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE employee_scheduler;

-- 用户表：存储登录用户，含角色
CREATE TABLE IF NOT EXISTS users (
  user_id       CHAR(36)     PRIMARY KEY,          -- 我们用 UUID 字符串，固定 36 长度
  email         VARCHAR(191) NOT NULL UNIQUE,      -- 登录名，唯一
  password_hash VARCHAR(100) NOT NULL,             -- bcrypt 哈希
  name          VARCHAR(100) NOT NULL,
  role          ENUM('boss','manager','employee') NOT NULL, -- 角色
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 班次表：日期 + 起止时间 + 地点等
CREATE TABLE IF NOT EXISTS shifts (
  shift_id    CHAR(36)     PRIMARY KEY,
  date        DATE         NOT NULL,               -- 仅日期；避免时区影响
  start_time  TIME         NOT NULL,               -- 起始时间（24h）
  end_time    TIME         NOT NULL,               -- 结束时间
  location    VARCHAR(100) NOT NULL,
  position    VARCHAR(100),
  notes       TEXT,
  version     INT          NOT NULL DEFAULT 1,
  created_by  CHAR(36)     NOT NULL,               -- 创建人（外键到 users）
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shift_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
  INDEX idx_shifts_date (date)                      -- 按日期查排班会快很多
) ENGINE=InnoDB;

-- 排班分配表：谁被分配到哪个班次
CREATE TABLE IF NOT EXISTS assignments (
  assignment_id CHAR(36)  PRIMARY KEY,
  user_id       CHAR(36)  NOT NULL,
  shift_id      CHAR(36)  NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_shift (user_id, shift_id),     -- 阻止同一员工被重复分配到同一班次
  CONSTRAINT fk_assign_user  FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_assign_shift FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  INDEX idx_assign_user (user_id),
  INDEX idx_assign_shift (shift_id)
) ENGINE=InnoDB;

SHOW TABLES;

DESCRIBE users;
DESCRIBE shifts;
DESCRIBE assignments;

SELECT email, role FROM users;
SELECT shift_id, date, start_time, end_time FROM shifts;
SELECT a.assignment_id, u.email, s.date, s.start_time, s.end_time
FROM assignments a
JOIN users u ON a.user_id = u.user_id
JOIN shifts s ON a.shift_id = s.shift_id;