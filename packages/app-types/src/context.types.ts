import type {
  MedusaNextFunction,
  MedusaNextFunction as Next,
  MedusaRequest,
  MedusaRequestHandler,
  MedusaResponse,
} from '@medusajs/framework/http';

import type { CustomErrors } from './common.types';

declare module '@medusajs/framework/http' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface MedusaRequest<Body = unknown, QueryFields = Record<string, unknown>> {
    validatedData: Body;
  }
}

declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Express {
    interface Response {
      throwError: (message: string, status?: number) => never;
      assertError: (condition: unknown, message: string, status?: number) => asserts condition;
      throwClientError: (errors: CustomErrors, status?: number) => never;
      assertClientError: (condition: unknown, errors: CustomErrors, status?: number) => asserts condition;
      throwGlobalErrorWithRedirect: (message: string, redirectUrl?: string) => void;
    }
  }
}

export type AppMedusaRequest<T = unknown, R = unknown> = MedusaRequest<T> & R;
export type AppRouterMiddleware<Body = unknown, Res = unknown> = MedusaRequestHandler<Body, Res>;

export type { MedusaNextFunction, MedusaRequest, MedusaResponse, Next };
