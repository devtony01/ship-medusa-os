import { z } from 'zod';

import type { MedusaNextFunction, MedusaRequest, MedusaResponse, ValidationErrors } from 'app-types';

import { validate } from '../validate.middleware';

const createMockRequest = (overrides: Partial<MedusaRequest> = {}): MedusaRequest => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as unknown as MedusaRequest;
};

const createMockResponse = (): MedusaResponse => {
  return {} as unknown as MedusaResponse;
};

describe('validate middleware', () => {
  it('should merge body, query, and params, set req.validatedData, and call next', async () => {
    const schema = z.object({
      id: z.string().min(1),
      page: z.coerce.number().int().positive(),
      email: z.string().trim().email(),
    });

    const req = createMockRequest({
      params: { id: 'usr_123' },
      query: { page: '2' },
      body: { email: '  chef@shipmedusa.com  ' },
    });
    const res = createMockResponse();
    let forwardedError: unknown;
    let nextCalled = false;
    const next: MedusaNextFunction = (err?: unknown) => {
      nextCalled = true;
      forwardedError = err;
    };

    await validate(schema)(req, res, next);

    expect(nextCalled).toBe(true);
    expect(forwardedError).toBeUndefined();
    expect(req.validatedData).toEqual({
      id: 'usr_123',
      page: 2,
      email: 'chef@shipmedusa.com',
    });
  });

  it('should format nested Zod issues into clientErrors and pass 400 HttpError to next', async () => {
    const schema = z.object({
      email: z.string().email('Invalid email address'),
      profile: z.object({
        age: z.number().min(18, 'Must be at least 18'),
      }),
    });

    const req = createMockRequest({
      body: { email: 'not-an-email', profile: { age: 16 } },
    });
    const res = createMockResponse();
    const captured: { error: (Error & { status?: number; clientErrors?: ValidationErrors }) | null } = {
      error: null,
    };
    const next: MedusaNextFunction = (err?: unknown) => {
      captured.error = (err ?? null) as (Error & { status?: number; clientErrors?: ValidationErrors }) | null;
    };

    await validate(schema)(req, res, next);

    expect(captured.error).not.toBeNull();
    expect(captured.error?.status).toBe(400);
    expect(captured.error?.clientErrors).toEqual({
      email: ['Invalid email address'],
      'profile.age': ['Must be at least 18'],
    });
    expect(req.validatedData).toBeUndefined();
  });

  it('should handle null or non-object req.body on GET-style requests', async () => {
    const schema = z.object({
      search: z.string().min(1),
      storeId: z.string().min(1),
    });

    const req = createMockRequest({
      body: null,
      query: { search: 'tacos' },
      params: { storeId: 'str_1' },
    });
    const res = createMockResponse();
    let forwardedError: unknown;
    const next: MedusaNextFunction = (err?: unknown) => {
      forwardedError = err;
    };

    await validate(schema)(req, res, next);

    expect(forwardedError).toBeUndefined();
    expect(req.validatedData).toEqual({
      search: 'tacos',
      storeId: 'str_1',
    });
  });

  it('should forward unexpected async schema errors to next', async () => {
    const unexpectedError = new Error('Async refinement failure');
    const schema = z.object({
      name: z.string().refine(async () => {
        throw unexpectedError;
      }),
    });

    const req = createMockRequest({ body: { name: 'Medusa' } });
    const res = createMockResponse();
    let forwardedError: unknown;
    const next: MedusaNextFunction = (err?: unknown) => {
      forwardedError = err;
    };

    await validate(schema)(req, res, next);

    expect(forwardedError).toBe(unexpectedError);
  });
});
