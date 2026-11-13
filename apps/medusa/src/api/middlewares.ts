import { defineMiddlewares } from '@medusajs/framework/http';
import { attachCustomErrors, attachCustomProperties, routeErrorHandler } from 'middlewares';

export default defineMiddlewares({
  errorHandler: routeErrorHandler,
  routes: [
    {
      matcher: '/*',
      middlewares: [attachCustomErrors, attachCustomProperties],
    },
  ],
});
