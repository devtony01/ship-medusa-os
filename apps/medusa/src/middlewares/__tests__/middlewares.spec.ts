import { MedusaError } from '@medusajs/framework/utils';

import type { MedusaNextFunction, MedusaRequest, MedusaResponse, ValidationErrors } from 'app-types';

import { attachCustomErrors, attachCustomProperties, routeErrorHandler } from '../index';

interface MockResponseState {
  statusCode: number;
  jsonData: unknown;
  redirectUrl: string | null;
  headersSent: boolean;
}

type MockResponse = MedusaResponse & MockResponseState;

const createMockResponse = (headersSent = false): MockResponse => {
  const state: MockResponseState = {
    statusCode: 200,
    jsonData: null,
    redirectUrl: null,
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
    redirect(url: string) {
      this.redirectUrl = url;
    },
  };

  return res as unknown as MockResponse;
};

const createMockRequest = (overrides: Partial<MedusaRequest> = {}): MedusaRequest => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as unknown as MedusaRequest;
};

describe('attachCustomErrors middleware (Unit)', () => {
  it('should attach error helper methods to response and call next', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    let nextCalled = false;
    const next: MedusaNextFunction = () => {
      nextCalled = true;
    };

    attachCustomErrors(req, res, next);

    expect(nextCalled).toBe(true);
    expect(typeof res.throwError).toBe('function');
    expect(typeof res.assertError).toBe('function');
    expect(typeof res.throwClientError).toBe('function');
    expect(typeof res.assertClientError).toBe('function');
    expect(typeof res.throwGlobalErrorWithRedirect).toBe('function');
  });

  it('res.throwError should throw an HttpError with custom status', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    attachCustomErrors(req, res, () => {});

    let capturedError: (Error & { status?: number }) | null = null;
    try {
      res.throwError('Unauthorized action', 401);
    } catch (err: unknown) {
      capturedError = err as Error & { status?: number };
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(401);
    expect(capturedError?.message).toBe('Unauthorized action');
  });

  it('res.assertError should throw when condition is false and pass when true', () => {
    const req = createMockRequest();
    const res: MockResponse = createMockResponse();
    attachCustomErrors(req, res, () => {});

    expect(() => res.assertError(true, 'Should not throw')).not.toThrow();

    let capturedError: (Error & { status?: number }) | null = null;
    try {
      res.assertError(false, 'Forbidden', 403);
    } catch (err: unknown) {
      capturedError = err as Error & { status?: number };
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(403);
    expect(capturedError?.message).toBe('Forbidden');
  });

  it('res.throwClientError should format errors array and attach clientErrors', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    attachCustomErrors(req, res, () => {});

    let capturedError: (Error & { status?: number; clientErrors?: ValidationErrors }) | null = null;
    try {
      res.throwClientError({ email: 'Invalid email', role: 'admin' }, 422);
    } catch (err: unknown) {
      capturedError = err as Error & { status?: number; clientErrors?: ValidationErrors };
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(422);
    expect(capturedError?.clientErrors).toEqual({
      email: ['Invalid email'],
      role: ['admin'],
    });
  });

  it('res.assertClientError should assert condition and attach clientErrors', () => {
    const req = createMockRequest();
    const res: MockResponse = createMockResponse();
    attachCustomErrors(req, res, () => {});

    expect(() => res.assertClientError(true, { email: 'Error' })).not.toThrow();

    let capturedError: (Error & { status?: number; clientErrors?: ValidationErrors }) | null = null;
    try {
      res.assertClientError(false, { password: 'Too short' });
    } catch (err: unknown) {
      capturedError = err as Error & { status?: number; clientErrors?: ValidationErrors };
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(400);
    expect(capturedError?.clientErrors).toEqual({
      password: ['Too short'],
    });
  });

  it('res.throwGlobalErrorWithRedirect should redirect with query parameter', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    attachCustomErrors(req, res, () => {});

    res.throwGlobalErrorWithRedirect('Invalid token', 'http://localhost:3000/auth');
    const expectedUrl = new URL('http://localhost:3000/auth');
    expectedUrl.searchParams.set('error', encodeURIComponent('Invalid token'));
    expect(res.redirectUrl).toBe(expectedUrl.toString());
  });
});

describe('attachCustomProperties middleware (Unit)', () => {
  it('should initialize req.validatedData as empty object and call next', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    let nextCalled = false;
    const next: MedusaNextFunction = () => {
      nextCalled = true;
    };

    attachCustomProperties(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.validatedData).toEqual({});
  });
});

describe('routeErrorHandler middleware (Unit)', () => {
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
