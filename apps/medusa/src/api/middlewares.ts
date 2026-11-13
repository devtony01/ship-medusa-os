import { defineMiddlewares } from '@medusajs/framework/http';
import { attachCustomErrors, attachCustomProperties, routeErrorHandler, validate } from 'middlewares';
import { z } from 'zod';

const testValidateSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  count: z.coerce.number().int().positive('Count must be a positive integer'),
});

export default defineMiddlewares({
  errorHandler: routeErrorHandler,
  routes: [
    {
      matcher: '/*',
      middlewares: [attachCustomErrors, attachCustomProperties],
    },
    {
      methods: ['POST'],
      matcher: '/test-middlewares',
      middlewares: [validate(testValidateSchema)],
    },
  ],
});
