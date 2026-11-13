import { loadEnv } from '@medusajs/framework/utils';
import { z } from 'zod';

import { validateConfig } from '../utils/config.util';

loadEnv(process.env.NODE_ENV || 'development', process.cwd());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  STORE_CORS: z.string().default('http://localhost:8000'),
  ADMIN_CORS: z.string().default('http://localhost:5173,http://localhost:9000'),
  AUTH_CORS: z.string().default('http://localhost:5173,http://localhost:9000'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET is required'),
  WEB_URL: z.string().default('http://localhost:3000'),
});

export type AppConfig = z.infer<typeof schema>;

const config = validateConfig<AppConfig>(schema);

export default config;
