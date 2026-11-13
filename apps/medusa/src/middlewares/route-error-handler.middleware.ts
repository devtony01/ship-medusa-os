import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import config from 'config';
import logger from 'logger';

import type { ValidationErrors } from 'app-types';

interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  clientErrors?: ValidationErrors;
}

const MEDUSA_ERROR_STATUS_MAP: Record<string, number> = {
  [MedusaError.Types.NOT_FOUND]: 404,
  [MedusaError.Types.UNAUTHORIZED]: 401,
  [MedusaError.Types.NOT_ALLOWED]: 403,
  [MedusaError.Types.CONFLICT]: 409,
  [MedusaError.Types.INVALID_DATA]: 400,
  [MedusaError.Types.INVALID_ARGUMENT]: 400,
};

const getErrorStatus = (err: CustomError): number => {
  if (err instanceof MedusaError && MEDUSA_ERROR_STATUS_MAP[err.type]) {
    return MEDUSA_ERROR_STATUS_MAP[err.type];
  }

  return err.status ?? err.statusCode ?? 500;
};

export const routeErrorHandler = (
  err: CustomError,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const clientError = err.clientErrors;
  const serverError = { global: err.message || 'Unknown error' };
  const errors = clientError || serverError;

  const loggerMetadata =
    config.NODE_ENV !== 'development'
      ? {
          requestBody: req.body,
          requestQuery: req.query,
        }
      : null;

  const logPayload = loggerMetadata
    ? JSON.stringify({ errors, metadata: loggerMetadata }, null, 2)
    : JSON.stringify(errors, null, 2);

  logger.error(logPayload);

  if (serverError && !clientError && config.NODE_ENV === 'production') {
    serverError.global = 'Something went wrong';
  }

  const status = getErrorStatus(err);
  res.status(status).json({ errors });
};

export default routeErrorHandler;
