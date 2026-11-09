import type { ZodType, ZodTypeDef } from 'zod';

export const validateConfig = <T>(schema: ZodType<T, ZodTypeDef, unknown>): T => {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

export default {
  validateConfig,
};
