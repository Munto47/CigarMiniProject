/**
 * 脱敏工具
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

export function maskEmail(email: string): string {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `*@${domain}`;
  return name[0] + '***' + name[name.length - 1] + '@' + domain;
}

export function maskPayload(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const sensitiveKeys = [
    'phone',
    'phone_encrypted',
    'password',
    'secret',
    'api_key',
    'card_no',
  ];
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      result[key] = '****';
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = maskPayload(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function truncateJson(data: unknown, maxBytes: number): unknown {
  const str = JSON.stringify(data);
  if (Buffer.byteLength(str, 'utf8') <= maxBytes) return data;
  return {
    _truncated: true,
    _original_size: Buffer.byteLength(str, 'utf8'),
    preview: str.slice(0, maxBytes),
  };
}
