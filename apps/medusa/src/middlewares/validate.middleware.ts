import createError from 'http-errors';
import type { ZodError, ZodIssue, ZodType } from 'zod';

import type {
  AppRouterMiddleware,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  ValidationErrors,
} from 'app-types';

const formatError = (zodError: ZodError): ValidationErrors => {
  const errors: ValidationErrors = {};

  zodError.issues.forEach((error: ZodIssue) => {
    const key = error.path.join('.');

    if (!errors[key]) {
      errors[key] = [];
    }

    (errors[key] as string[]).push(error.message);
  });

  return errors;
};

export const validate =
  (schema: ZodType): AppRouterMiddleware =>
  async (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction): Promise<void> => {
    try {
      const bodyData = typeof req.body === 'object' && req.body !== null ? req.body : {};

      const result = await schema.safeParseAsync({
        ...bodyData,
        ...req.query,
        ...req.params,
      });

      if (!result.success) {
        next(createError(400, { clientErrors: formatError(result.error) }));
        return;
      }

      req.validatedData = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };

export default validate;
