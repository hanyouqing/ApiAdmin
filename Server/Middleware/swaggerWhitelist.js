import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';

const parseIP = ip => {
  if (ip.includes('/')) {
    const [address, prefixLength] = ip.split('/');
    return {
      type: 'cidr',
      address,
      prefixLength: parseInt(prefixLength, 10),
    };
  }
  return {
    type: 'single',
    address: ip,
  };
};

const ipToNumber = ip => {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

const isIPInCIDR = (ip, cidr) => {
  const ipNum = ipToNumber(ip);
  const { address, prefixLength } = cidr;
  const networkNum = ipToNumber(address);
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
};

const normalizeClientIP = ip => {
  if (!ip || ip === 'unknown') return ip;
  let normalized = String(ip).trim();
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7);
  }
  if (normalized === '::1') {
    return '127.0.0.1';
  }
  return normalized;
};

const isIPAllowed = (clientIP, allowedIPs) => {
  if (!allowedIPs || allowedIPs.length === 0) {
    return true;
  }

  const normalizedClient = normalizeClientIP(clientIP);

  for (const allowedIP of allowedIPs) {
    const parsed = parseIP(allowedIP.trim());
    const allowedAddress = normalizeClientIP(parsed.address);

    if (parsed.type === 'single') {
      if (normalizedClient === allowedAddress || clientIP === parsed.address) {
        return true;
      }
    } else if (parsed.type === 'cidr') {
      if (isIPInCIDR(normalizedClient, { ...parsed, address: allowedAddress })) {
        return true;
      }
    }
  }

  return false;
};

export const swaggerWhitelistMiddleware = async (ctx, next) => {
  const swaggerEnabled =
    config.SWAGGER_ENABLED === true ||
    config.SWAGGER_ENABLED === 'true' ||
    config.SWAGGER_ENABLED === '1';

  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }

  const allowedIPs = config.SWAGGER_ALLOWED_IP_ADDRESSES
    ? config.SWAGGER_ALLOWED_IP_ADDRESSES.split(',')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0)
    : [];

  if (allowedIPs.length > 0) {
    const forwardedFor = ctx.request.headers['x-forwarded-for'];
    const realIP = ctx.request.headers['x-real-ip'];
    const socketIP = ctx.request.socket?.remoteAddress;

    let clientIP = 'unknown';
    if (forwardedFor) {
      clientIP = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
      clientIP = realIP.trim();
    } else if (socketIP) {
      clientIP = socketIP;
    } else if (ctx.ip) {
      clientIP = ctx.ip;
    }

    clientIP = normalizeClientIP(clientIP);

    if (clientIP === 'unknown' || !isIPAllowed(clientIP, allowedIPs)) {
      logger.warn(`Swagger UI access denied for IP: ${clientIP}`);
      ctx.status = 404;
      ctx.body = { error: 'Not Found' };
      return;
    }
  }

  await next();
};
