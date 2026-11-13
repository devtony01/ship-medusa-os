import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
import middlewares from 'api/middlewares';

import type { MedusaNextFunction, MedusaRequest, MedusaResponse, ValidationErrors } from 'app-types';

interface ErrorResponseBody {
  errors: ValidationErrors | { global: string };
}

interface PropertiesResponseBody {
  hasValidatedData: boolean;
}

interface ValidatedResponseBody {
  validatedData: {
    email: string;
    count: number;
  };
}

interface HttpClientResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string | string[] | undefined>;
}

interface TestApiClient {
  get: <T = unknown>(
    url: string,
    config?: {
      validateStatus?: () => boolean;
      maxRedirects?: number;
      headers?: Record<string, string>;
    },
  ) => Promise<HttpClientResponse<T>>;
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: {
      validateStatus?: () => boolean;
      maxRedirects?: number;
      headers?: Record<string, string>;
    },
  ) => Promise<HttpClientResponse<T>>;
}

jest.setTimeout(180 * 1000);

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    const client: TestApiClient = api;

    describe('medusa HTTP middlewares integration', () => {
      it('boots Medusa with augmented middleware types configured', () => {
        const errorHandler:
          | ((err: Error, req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void)
          | false
          | undefined = middlewares.errorHandler;

        expect(typeof errorHandler).toBe('function');
        expect(Array.isArray(middlewares.routes)).toBe(true);
      });

      it('get /health should respond with 200 OK on live Medusa server', async () => {
        const response = await client.get<string>('/health');

        expect(response.status).toBe(200);
        expect(response.data).toBe('OK');
      });

      it('get /store/products without publishable key should format MedusaError through routeErrorHandler', async () => {
        const response = await client.get<ErrorResponseBody>('/store/products', {
          validateStatus: () => true,
        });

        expect(response.status).toBe(403);
        expect(response.data).toEqual({
          errors: {
            global: expect.stringContaining('Publishable API key required'),
          },
        });
      });

      it('post /auth/user/emailpass with invalid payload should format error through routeErrorHandler', async () => {
        const response = await client.post<ErrorResponseBody>(
          '/auth/user/emailpass',
          {},
          { validateStatus: () => true },
        );

        expect(response.status).toBe(401);
        expect(response.data).toEqual({
          errors: {
            global: expect.any(String),
          },
        });
      });

      it('get /test-middlewares?mode=properties should attach req.validatedData on live Medusa', async () => {
        const response = await client.get<PropertiesResponseBody>('/test-middlewares?mode=properties');

        expect(response.status).toBe(200);
        expect(response.data).toEqual({ hasValidatedData: true });
      });

      it('get /test-middlewares?mode=client-error should format res.assertClientError through routeErrorHandler', async () => {
        const response = await client.get<ErrorResponseBody>('/test-middlewares?mode=client-error', {
          validateStatus: () => true,
        });

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          errors: { email: ['Email is required'] },
        });
      });

      it('get /test-middlewares?mode=forbidden should format res.assertError through routeErrorHandler', async () => {
        const response = await client.get<ErrorResponseBody>('/test-middlewares?mode=forbidden', {
          validateStatus: () => true,
        });

        expect(response.status).toBe(403);
        expect(response.data).toEqual({
          errors: { global: 'Forbidden resource' },
        });
      });

      it('get /test-middlewares?mode=medusa-error should format MedusaError through routeErrorHandler', async () => {
        const response = await client.get<ErrorResponseBody>('/test-middlewares?mode=medusa-error', {
          validateStatus: () => true,
        });

        expect(response.status).toBe(404);
        expect(response.data).toEqual({
          errors: { global: 'Target item not found' },
        });
      });

      it('get /test-middlewares?mode=redirect should return 302 with error query param via res.throwGlobalErrorWithRedirect', async () => {
        const response = await client.get<string>('/test-middlewares?mode=redirect', {
          maxRedirects: 0,
          validateStatus: () => true,
        });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('error=Session');
      });

      it('post /test-middlewares with valid payload should coerce, trim, and attach req.validatedData', async () => {
        const response = await client.post<ValidatedResponseBody>('/test-middlewares?count=3', {
          email: '  chef@shipmedusa.com  ',
        });

        expect(response.status).toBe(200);
        expect(response.data).toEqual({
          validatedData: {
            email: 'chef@shipmedusa.com',
            count: 3,
          },
        });
      });

      it('post /test-middlewares with invalid payload should format Zod validation errors via routeErrorHandler', async () => {
        const response = await client.post<ErrorResponseBody>(
          '/test-middlewares',
          {
            email: 'invalid-email',
            count: 0,
          },
          { validateStatus: () => true },
        );

        expect(response.status).toBe(400);
        expect(response.data).toEqual({
          errors: {
            email: ['Invalid email address'],
            count: ['Count must be a positive integer'],
          },
        });
      });
    });
  },
});
