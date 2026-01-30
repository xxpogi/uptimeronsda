import { isUrlSafe, isValidUUID, sanitizeLabel } from './security.js';

export function validateSite(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  const errors = validateSiteCreate(body);
  if (errors.length > 0) {
    return { valid: false, error: errors[0].message };
  }
  return { valid: true };
}

export function validateSiteUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  const errors = validateSiteUpdateFields(body);
  if (errors.length > 0) {
    return { valid: false, error: errors[0].message };
  }
  return { valid: true };
}

function validateSiteCreate(body) {
  const errors = [];
  
  if (!body.url || typeof body.url !== 'string') {
    errors.push({ field: 'url', message: 'URL is required' });
  } else {
    const urlCheck = isUrlSafe(body.url.trim());
    if (!urlCheck.safe) {
      errors.push({ field: 'url', message: urlCheck.reason });
    }
  }
  
  if (!body.label || typeof body.label !== 'string' || body.label.trim().length === 0) {
    errors.push({ field: 'label', message: 'Label is required' });
  } else if (body.label.length > 100) {
    errors.push({ field: 'label', message: 'Label must be 100 characters or less' });
  }
  
  if (body.checkInterval !== undefined) {
    const interval = parseInt(body.checkInterval);
    if (isNaN(interval) || interval < 1 || interval > 60) {
      errors.push({ field: 'checkInterval', message: 'Check interval must be between 1 and 60 minutes' });
    }
  }
  
  if (body.timeout !== undefined) {
    const timeout = parseInt(body.timeout);
    if (isNaN(timeout) || timeout < 1000 || timeout > 120000) {
      errors.push({ field: 'timeout', message: 'Timeout must be between 1000 and 120000 ms' });
    }
  }
  
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push({ field: 'tags', message: 'Tags must be an array' });
  }
  
  return errors;
}

function validateSiteUpdateFields(body) {
  const errors = [];
  
  if (body.label !== undefined) {
    if (typeof body.label !== 'string' || body.label.length > 100) {
      errors.push({ field: 'label', message: 'Label must be 100 characters or less' });
    }
  }
  
  if (body.checkInterval !== undefined) {
    const interval = parseInt(body.checkInterval);
    if (isNaN(interval) || interval < 1 || interval > 60) {
      errors.push({ field: 'checkInterval', message: 'Check interval must be between 1 and 60 minutes' });
    }
  }
  
  if (body.timeout !== undefined) {
    const timeout = parseInt(body.timeout);
    if (isNaN(timeout) || timeout < 1000 || timeout > 120000) {
      errors.push({ field: 'timeout', message: 'Timeout must be between 1000 and 120000 ms' });
    }
  }
  
  if (body.isPaused !== undefined && typeof body.isPaused !== 'boolean') {
    errors.push({ field: 'isPaused', message: 'isPaused must be a boolean' });
  }
  
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push({ field: 'tags', message: 'Tags must be an array' });
  }
  
  return errors;
}

export function validateBulkImport(sites) {
  const errors = [];
  const validSites = [];

  if (!Array.isArray(sites)) {
    return { valid: false, errors: [{ field: 'sites', message: 'Sites must be an array' }], validSites: [] };
  }

  if (sites.length === 0) {
    return { valid: false, errors: [{ field: 'sites', message: 'At least one site is required' }], validSites: [] };
  }

  if (sites.length > 50) {
    return { valid: false, errors: [{ field: 'sites', message: 'Maximum 50 sites per import' }], validSites: [] };
  }

  sites.forEach((site, index) => {
    if (!site.url) {
      errors.push({ field: `sites[${index}].url`, message: 'URL is required' });
    } else {
      const urlCheck = isUrlSafe(site.url);
      if (!urlCheck.safe) {
        errors.push({ field: `sites[${index}].url`, message: urlCheck.reason });
      } else {
        validSites.push(site);
      }
    }
  });

  return { valid: validSites.length > 0, errors, validSites };
}

export function validateId(id) {
  if (!isValidUUID(id)) {
    return [{ field: 'id', message: 'Invalid ID format' }];
  }
  return [];
}
