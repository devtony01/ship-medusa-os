import { defineConfig } from '@medusajs/framework/utils';

import config from './src/config';

export default defineConfig({
  projectConfig: {
    databaseUrl: config.DATABASE_URL,
    redisUrl: config.REDIS_URL,
    http: {
      storeCors: config.STORE_CORS,
      adminCors: config.ADMIN_CORS,
      authCors: config.AUTH_CORS,
      jwtSecret: config.JWT_SECRET,
      cookieSecret: config.COOKIE_SECRET,
    },
  },
  modules: [],
  plugins: [],
});
