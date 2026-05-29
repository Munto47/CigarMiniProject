'use strict';
/**
 * 生产环境初始化脚本
 * 在 entrypoint.sh 中执行，使用 pg 模块直连数据库，无需 psql
 * 读取并执行 prisma/init.sql（完全幂等）
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    console.log('  ✓ 基础数据初始化完成（幂等，已有数据不受影响）');
  } catch (err) {
    console.error('  ✗ 基础数据初始化失败:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
