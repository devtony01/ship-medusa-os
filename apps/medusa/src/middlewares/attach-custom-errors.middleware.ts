import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import config from 'config';
import createError from 'http-errors';

import type { CustomErrors, ValidationErrors } from 'app-types';

const formatError = (customError: CustomErrors): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(customError).forEach((key) => {
    errors[key] = Array.isArray(customError[key]) ? (customError[key] as string[]) : [String(customError[key])];
  });

  return errors;
};

export const attachCustomErrors = (_req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void => {
  res.throwError = (message: string, status = 400): never => {
    throw createError(status, message);
  };

  res.assertError = (condition: unknown, message: string, status = 400): asserts condition => {
    if (!condition) {
      throw createError(status, message);
    }
  };

  res.throwClientError = (errors: CustomErrors, status = 400): never => {
    throw createError(status, { clientErrors: formatError(errors) });
  };

  res.assertClientError = (condition: unknown, errors: CustomErrors, status = 400): asserts condition => {
    if (!condition) {
      throw createError(status, { clientErrors: formatError(errors) });
    }
  };

  res.throwGlobalErrorWithRedirect = (message: string, redirectUrl: string = config.WEB_URL): void => {
    const url = new URL(redirectUrl);
    url.searchParams.set('error', encodeURIComponent(message));
    res.redirect(url.toString());
  };

  next();
};

export default attachCustomErrors;
