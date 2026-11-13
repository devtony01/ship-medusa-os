import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from 'app-types';

import { attachCustomProperties } from '../attach-custom-properties.middleware';

const createMockRequest = (): MedusaRequest => {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
  } as unknown as MedusaRequest;
};

const createMockResponse = (): MedusaResponse => {
  return {} as unknown as MedusaResponse;
};

describe('attachCustomProperties middleware', () => {
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
