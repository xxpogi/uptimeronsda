import { body, validationResult } from 'express-validator';

const isValidUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch { return false; }
};

export const validateSite = [
  body('url').trim().notEmpty().withMessage('URL required').custom(isValidUrl).withMessage('Invalid URL'),
  body('label').trim().notEmpty().withMessage('Label required').isLength({ max: 100 }),
  body('checkInterval').optional().isInt({ min: 1, max: 60 }),
  body('timeout').optional().isInt({ min: 1000, max: 120000 }),
  body('tags').optional().isArray(),
  body('groupName').optional().isString()
];

export const validateUpdate = [
  body('label').optional().trim().isLength({ max: 100 }),
  body('checkInterval').optional().isInt({ min: 1, max: 60 }),
  body('timeout').optional().isInt({ min: 1000, max: 120000 }),
  body('isPaused').optional().isBoolean(),
  body('tags').optional().isArray()
];

export const handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  next();
};
