import { logger } from '@medusajs/framework/logger';

type LoggerInstance = typeof logger;

declare global {
  // eslint-disable-next-line vars-on-top
  var logger: LoggerInstance;
}

globalThis.logger = logger;

export default logger;
