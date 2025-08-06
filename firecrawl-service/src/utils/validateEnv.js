/**
 * Environment Validation Utility
 * Security-focused validation of required environment variables
 */

/**
 * Required environment variables with their validation rules
 */
const REQUIRED_ENV_VARS = {
  // Security Critical
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT signing secret (minimum 32 characters for security)',
    security: 'critical'
  },
  
  // Database Security
  DB_PASSWORD: {
    required: true,
    minLength: 8,
    description: 'Database password (minimum 8 characters)',
    security: 'high'
  },
  
  // Database Connection
  DB_HOST: {
    required: false,
    default: 'localhost',
    description: 'Database hostname',
    security: 'medium'
  },
  
  DB_PORT: {
    required: false,
    default: '5433',
    validator: (value) => {
      const port = parseInt(value);
      return port > 0 && port <= 65535;
    },
    description: 'Database port (1-65535)',
    security: 'medium'
  },
  
  DB_NAME: {
    required: false,
    default: 'firecrawl_db',
    description: 'Database name',
    security: 'low'
  },
  
  DB_USER: {
    required: false,
    default: 'firecrawl_user',
    description: 'Database username',
    security: 'medium'
  },
  
  // Application Security
  NODE_ENV: {
    required: false,
    default: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Node environment (development|production|test)',
    security: 'medium'
  },
  
  PORT: {
    required: false,
    default: '3001',
    validator: (value) => {
      const port = parseInt(value);
      return port > 0 && port <= 65535;
    },
    description: 'Application port (1-65535)',
    security: 'low'
  }
};

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.securityIssues = [];
    this.missing = [];
    this.validated = {};
  }

  addError(variable, message, severity = 'high') {
    this.isValid = false;
    const error = { variable, message, severity, type: 'error' };
    this.errors.push(error);
    
    if (severity === 'critical') {
      this.securityIssues.push(error);
    }
  }

  addWarning(variable, message, severity = 'medium') {
    const warning = { variable, message, severity, type: 'warning' };
    this.warnings.push(warning);
  }

  addMissing(variable, config) {
    this.missing.push({ variable, ...config });
    if (config.required) {
      this.addError(variable, `Required environment variable '${variable}' is missing`, config.security);
    }
  }

  addValidated(variable, value, isDefault = false) {
    this.validated[variable] = { value, isDefault };
  }
}

/**
 * Validate individual environment variable
 */
const validateVariable = (variable, config, result) => {
  const value = process.env[variable];
  
  // Check if variable exists
  if (!value || value.trim() === '') {
    if (config.required) {
      result.addMissing(variable, config);
      return;
    } else if (config.default) {
      result.addValidated(variable, config.default, true);
      result.addWarning(variable, `Using default value: ${config.default}`);
      return;
    }
  }

  const actualValue = value || config.default;
  
  // Validate minimum length
  if (config.minLength && actualValue.length < config.minLength) {
    result.addError(
      variable, 
      `Minimum length ${config.minLength} characters, got ${actualValue.length}`,
      config.security === 'critical' ? 'critical' : 'high'
    );
    return;
  }

  // Run custom validator
  if (config.validator && !config.validator(actualValue)) {
    result.addError(variable, `Invalid value format. ${config.description}`, config.security);
    return;
  }

  // Security checks for production
  if (process.env.NODE_ENV === 'production') {
    if (variable === 'JWT_SECRET' && (
      actualValue === 'fallback-secret-change-in-production' ||
      actualValue.includes('default') ||
      actualValue.includes('secret')
    )) {
      result.addError(
        variable,
        'JWT_SECRET appears to be a default/weak value in production',
        'critical'
      );
    }

    if (variable === 'DB_PASSWORD' && (
      actualValue.length < 12 ||
      ['password', '123456', 'admin', 'root'].includes(actualValue.toLowerCase())
    )) {
      result.addError(
        variable,
        'Database password is weak for production environment',
        'high'
      );
    }
  }

  result.addValidated(variable, actualValue, !value);
};

/**
 * Main environment validation function
 */
export const validateEnvironment = () => {
  const result = new ValidationResult();
  
  // Validate each required variable
  Object.entries(REQUIRED_ENV_VARS).forEach(([variable, config]) => {
    validateVariable(variable, config, result);
  });

  // Additional security checks
  performSecurityChecks(result);

  return result;
};

/**
 * Perform additional security validation checks
 */
const performSecurityChecks = (result) => {
  // Check for dangerous default values in production
  if (process.env.NODE_ENV === 'production') {
    const dangerousDefaults = [
      'fallback-secret-change-in-production',
      'secure_password_change_me',
      'default_password'
    ];

    Object.values(process.env).forEach(value => {
      if (dangerousDefaults.some(dangerous => value && value.includes(dangerous))) {
        result.addError(
          'SECURITY_CHECK',
          'Default/fallback values detected in production environment',
          'critical'
        );
      }
    });
  }

  // Check for adequate JWT secret entropy
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length >= 32) {
    const entropy = calculateEntropy(jwtSecret);
    if (entropy < 3.0) {
      result.addWarning(
        'JWT_SECRET',
        'JWT secret has low entropy, consider using a more random value'
      );
    }
  }
};

/**
 * Calculate basic entropy of a string
 */
const calculateEntropy = (str) => {
  const freq = {};
  for (let char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  Object.values(freq).forEach(count => {
    const p = count / len;
    entropy -= p * Math.log2(p);
  });
  
  return entropy;
};

/**
 * Format validation results for logging
 */
export const formatValidationResults = (result) => {
  const output = {
    status: result.isValid ? 'VALID' : 'INVALID',
    summary: {
      errors: result.errors.length,
      warnings: result.warnings.length,
      securityIssues: result.securityIssues.length,
      missing: result.missing.length,
      validated: Object.keys(result.validated).length
    }
  };

  if (result.errors.length > 0) {
    output.errors = result.errors;
  }

  if (result.warnings.length > 0) {
    output.warnings = result.warnings;
  }

  if (result.securityIssues.length > 0) {
    output.securityIssues = result.securityIssues;
  }

  if (result.missing.length > 0) {
    output.missing = result.missing.map(m => ({
      variable: m.variable,
      description: m.description,
      required: m.required,
      security: m.security
    }));
  }

  return output;
};

/**
 * Validate and throw on critical errors
 */
export const validateOrThrow = () => {
  const result = validateEnvironment();
  
  if (!result.isValid) {
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    const highErrors = result.errors.filter(e => e.severity === 'high');
    
    if (criticalErrors.length > 0) {
      throw new Error(
        `Critical environment validation errors:\n${
          criticalErrors.map(e => `  - ${e.variable}: ${e.message}`).join('\n')
        }`
      );
    }
    
    if (highErrors.length > 0 && process.env.NODE_ENV === 'production') {
      throw new Error(
        `High-severity environment validation errors in production:\n${
          highErrors.map(e => `  - ${e.variable}: ${e.message}`).join('\n')
        }`
      );
    }
  }
  
  return result;
};

/**
 * Get environment variable safely with validation
 */
export const getEnvVar = (variable, options = {}) => {
  const { required = false, defaultValue = null, validator = null } = options;
  
  const value = process.env[variable] || defaultValue;
  
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Required environment variable '${variable}' is missing`);
  }
  
  if (validator && value && !validator(value)) {
    throw new Error(`Environment variable '${variable}' has invalid format`);
  }
  
  return value;
};

export default {
  validateEnvironment,
  validateOrThrow,
  formatValidationResults,
  getEnvVar
};