import { MedusaError } from '@medusajs/framework/utils';

import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from 'app-types';

import { routeErrorHandler } from '../route-error-handler.middleware';

interface MockResponseState {
  statusCode: number;
  jsonData: unknown;
  headersSent: boolean;
}

type MockResponse = MedusaResponse & MockResponseState;

const createMockResponse = (headersSent = false): MockResponse => {
  const state: MockResponseState = {
    statusCode: 200,
    jsonData: null,
    headersSent,
  };

  const res = {
    ...state,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.jsonData = data;
      return this;
    },
  };

  return res as unknown as MockResponse;
};

const createMockRequest = (): MedusaRequest => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
  } as unknown as MedusaRequest;
};

describe('routeErrorHandler middleware', () => {
  it('should delegate to next(err) if headers are already sent', () => {
    const req = createMockRequest();
    const res = createMockResponse(true);
    let forwardedError: unknown = null;
    const next: MedusaNextFunction = (err) => {
      forwardedError = err;
    };

    const testError = new Error('Already streamed');
    routeErrorHandler(testError, req, res, next);

    expect(forwardedError).toBe(testError);
    expect(res.jsonData).toBeNull();
  });

  it('should format clientErrors and return proper status code', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const clientErr = Object.assign(new Error('Validation failed'), {
      status: 422,
      clientErrors: { email: ['Email already exists'] },
    });

    routeErrorHandler(clientErr, req, res, () => {});

    expect(res.statusCode).toBe(422);
    expect(res.jsonData).toEqual({
      errors: { email: ['Email already exists'] },
    });
  });

  it('should map MedusaError.Types to proper HTTP status codes', () => {
    const notFoundError = new MedusaError(MedusaError.Types.NOT_FOUND, 'Entity not found');
    const unauthorizedError = new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Please sign in');
    const conflictError = new MedusaError(MedusaError.Types.CONFLICT, 'Already exists');

    const req = createMockRequest();

    const res1 = createMockResponse();
    routeErrorHandler(notFoundError, req, res1, () => {});
    expect(res1.statusCode).toBe(404);
    expect(res1.jsonData).toEqual({ errors: { global: 'Entity not found' } });

    const res2 = createMockResponse();
    routeErrorHandler(unauthorizedError, req, res2, () => {});
    expect(res2.statusCode).toBe(401);
    expect(res2.jsonData).toEqual({ errors: { global: 'Please sign in' } });

    const res3 = createMockResponse();
    routeErrorHandler(conflictError, req, res3, () => {});
    expect(res3.statusCode).toBe(409);
    expect(res3.jsonData).toEqual({ errors: { global: 'Already exists' } });
  });

  it('should return 500 for unhandled generic errors', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const err = new Error('Database connection dropped');

    routeErrorHandler(err, req, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.jsonData).toEqual({ errors: { global: 'Database connection dropped' } });
  });
});
