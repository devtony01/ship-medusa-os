import type { MedusaNextFunction, MedusaRequest, MedusaResponse, ValidationErrors } from 'app-types';

import { attachCustomErrors } from '../attach-custom-errors.middleware';

interface MockResponseState {
  redirectUrl: string | null;
}

type MockResponse = MedusaResponse & MockResponseState;

const createMockResponse = (): MockResponse => {
  const res = {
    redirectUrl: null as string | null,
    redirect(url: string) {
      this.redirectUrl = url;
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

describe('attachCustomErrors middleware', () => {
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
