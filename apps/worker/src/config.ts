export const config = {
  redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  redisPassword: process.env.REDIS_PASSWORD ?? '',
  gatewayUrl: (process.env.GATEWAY_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, ''),
  gatewayHmacSecret: process.env.GATEWAY_HMAC_SECRET ?? '',
};
