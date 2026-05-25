/**
 * 时间工具
 * 全局原则：时间一律 UTC TIMESTAMPTZ 存储，输出 YYYY-MM-DD HH:mm:ss（北京时间）
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 将 UTC 时间转为北京时间字符串 (YYYY-MM-DD HH:mm:ss) */
export function toBeijing(d: Date | string | number): string {
  const date = new Date(d);
  // 北京时间 = UTC + 8
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 480);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 返回当前北京时间字符串 */
export function nowBeijing(): string {
  return toBeijing(new Date());
}

/** 返回当前北京时间今天 00:00:00（作为 Date 对象，用于数据库查询） */
export function beijingTodayStart(): Date {
  const now = new Date();
  // 转换为北京时间
  now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 480);
  now.setHours(0, 0, 0, 0);
  // 转回 UTC
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset() - 480);
  return now;
}

/** 返回当前 UTC Date */
export function nowUtc(): Date {
  return new Date();
}
