/**
 * 金额工具函数
 * 全局原则：金额一律以「分」存储，输出时同时返回 _cents 与 _yuan
 */
export function centsToYuan(cents: bigint | number): string {
  return (Number(cents) / 100).toFixed(2);
}

export function yuanToCents(yuan: string | number): bigint {
  return BigInt(Math.round(parseFloat(String(yuan)) * 100));
}
