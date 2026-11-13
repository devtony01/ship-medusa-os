import { MedusaError } from '@medusajs/framework/utils';

import type { MedusaRequest, MedusaResponse } from 'app-types';

type TestModeHandler = (req: MedusaRequest, res: MedusaResponse) => void;

const MODE_HANDLERS: Record<string, TestModeHandler> = {
  properties: (req: MedusaRequest, res: MedusaResponse) => {
    res.json({
      hasValidatedData: typeof req.validatedData === 'object' && req.validatedData !== null,
    });
  },
  'client-error': (_req: MedusaRequest, res: MedusaResponse) => {
    res.assertClientError(false, { email: 'Email is required' }, 400);
  },
  forbidden: (_req: MedusaRequest, res: MedusaResponse) => {
    res.assertError(false, 'Forbidden resource', 403);
  },
  'medusa-error': () => {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Target item not found');
  },
  redirect: (_req: MedusaRequest, res: MedusaResponse) => {
    res.throwGlobalErrorWithRedirect('Session expired', 'http://localhost:3000/auth');
  },
};

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const mode = typeof req.query.mode === 'string' ? req.query.mode : 'properties';
  const handler = MODE_HANDLERS[mode] ?? MODE_HANDLERS.properties;

  handler(req, res);
};

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  res.json({
    validatedData: req.validatedData,
  });
};
