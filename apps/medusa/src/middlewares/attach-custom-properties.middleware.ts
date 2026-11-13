import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export const attachCustomProperties = (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction): void => {
  req.validatedData = {};

  next();
};

export default attachCustomProperties;
