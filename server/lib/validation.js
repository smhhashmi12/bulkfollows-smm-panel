import { z } from 'zod';

// Common field schemas
export const schemas = {
  // Payment schemas
  createOrderSchema: z.object({
    paymentId: z.string().uuid('Invalid payment ID format'),
    amount: z.number().positive('Amount must be positive').finite('Amount must be a valid number'),
    customerEmail: z.string().email('Invalid email format'),
    customerName: z.string().min(1, 'Customer name is required').max(100, 'Customer name too long'),
    returnUrl: z.string().url('Invalid return URL'),
    cancelUrl: z.string().url('Invalid cancel URL'),
  }),

  // Admin schemas
  createAdminSchema: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  }),

  // Provider schemas
  updateProviderSchema: z.object({
    providerId: z.string().uuid('Invalid provider ID format'),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    balance: z.number().nonnegative('Balance cannot be negative').optional(),
  }),

  // Order schemas
  createOrderItemSchema: z.object({
    serviceId: z.string().uuid('Invalid service ID format'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
    link: z.string().url('Invalid link URL').optional(),
  }),

  // Service schemas
  updateServiceSchema: z.object({
    serviceId: z.string().uuid('Invalid service ID format'),
    status: z.enum(['active', 'inactive']).optional(),
    rate_per_1000: z.number().positive('Rate must be positive').optional(),
    min_quantity: z.number().nonnegative('Min quantity cannot be negative').optional(),
    max_quantity: z.number().positive('Max quantity must be positive').optional(),
  }),
};

/**
 * Validates request body against a given schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.body);
    req.validatedBody = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

/**
 * Validates request query string against a given schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.query);
    req.validatedQuery = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

/**
 * Validates request params against a given schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.params);
    req.validatedParams = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Route parameter validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};
