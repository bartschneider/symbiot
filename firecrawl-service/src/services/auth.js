import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';

class AuthService {
  constructor() {
    // In a production system, this would be a database
    // For demo purposes, we'll use an in-memory store
    this.users = new Map();
    this.tokens = new Set(); // Track valid tokens for revocation
    
    // Create a default user for testing
    this.initializeDefaultUser();
  }

  /**
   * Initialize default user for testing
   */
  async initializeDefaultUser() {
    const hashedPassword = await bcrypt.hash('demo123', config.security.bcryptRounds);
    this.users.set('demo', {
      id: 'demo',
      username: 'demo',
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      isActive: true
    });
  }

  /**
   * Register a new user
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @param {string} role - User role
   * @returns {Object} - User info (without password)
   */
  async register(username, password, role = 'user') {
    try {
      // Validate input
      this.validateUserInput(username, password);
      
      // Check if user already exists
      if (this.users.has(username)) {
        throw new Error('Username already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);
      
      // Create user object
      const user = {
        id: username, // In production, use UUID
        username,
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      // Store user
      this.users.set(username, user);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
      
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user and generate JWT token
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Object} - Authentication result with token
   */
  async login(username, password) {
    try {
      // Validate input
      this.validateUserInput(username, password);
      
      // Find user
      const user = this.users.get(username);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      // Track token
      this.tokens.add(token);
      
      // Return authentication result
      const { password: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token,
        expiresIn: config.jwt.expiresIn
      };
      
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'firecrawl-service',
      audience: 'firecrawl-api'
    });
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyToken(token) {
    try {
      // Check if token is in our valid tokens set
      if (!this.tokens.has(token)) {
        throw new Error('Token has been revoked');
      }
      
      // Verify token signature and expiration
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'firecrawl-service',
        audience: 'firecrawl-api'
      });
      
      return decoded;
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Remove expired token from valid tokens
        this.tokens.delete(token);
        throw new Error('Token has expired');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      
      throw error;
    }
  }

  /**
   * Refresh JWT token
   * @param {string} token - Current JWT token
   * @returns {Object} - New token information
   */
  async refreshToken(token) {
    try {
      // Verify current token (even if expired)
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true });
      } catch (error) {
        throw new Error('Invalid token for refresh');
      }
      
      // Check if user still exists and is active
      const user = this.users.get(decoded.username);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      // Remove old token
      this.tokens.delete(token);
      
      // Generate new token
      const newToken = this.generateToken(user);
      this.tokens.add(newToken);
      
      return {
        token: newToken,
        expiresIn: config.jwt.expiresIn
      };
      
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke JWT token (logout)
   * @param {string} token - JWT token to revoke
   * @returns {boolean} - Success status
   */
  revokeToken(token) {
    return this.tokens.delete(token);
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Object|null} - User object without password
   */
  getUser(username) {
    const user = this.users.get(username);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  /**
   * Update user information
   * @param {string} username - Username
   * @param {Object} updates - Updates to apply
   * @returns {Object} - Updated user info
   */
  async updateUser(username, updates) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Handle password update
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, config.security.bcryptRounds);
    }
    
    // Update user
    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    this.users.set(username, updatedUser);
    
    // Return without password
    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Deactivate user account
   * @param {string} username - Username
   * @returns {boolean} - Success status
   */
  deactivateUser(username) {
    const user = this.users.get(username);
    if (user) {
      user.isActive = false;
      user.deactivatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Validate user input
   * @param {string} username - Username
   * @param {string} password - Password
   */
  validateUserInput(username, password) {
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Username validation (alphanumeric + underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    
    // Password strength validation
    if (!/(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*\d)|(?=.*[A-Z])(?=.*\d)/.test(password)) {
      // Require at least two of: lowercase, uppercase, numbers
      throw new Error('Password must contain at least two of: lowercase letters, uppercase letters, numbers');
    }
  }

  /**
   * Generate API key for service-to-service communication
   * @param {string} username - Username
   * @param {string} description - Key description
   * @returns {Object} - API key information
   */
  generateApiKey(username, description = '') {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate API key (in production, use crypto.randomBytes)
    const apiKey = 'ak_' + Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
    
    // Store API key (in production, hash the key)
    if (!user.apiKeys) {
      user.apiKeys = [];
    }
    
    const keyInfo = {
      id: Math.random().toString(36).substring(2, 9),
      key: apiKey,
      description,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    };
    
    user.apiKeys.push(keyInfo);
    
    return {
      id: keyInfo.id,
      key: apiKey,
      description,
      createdAt: keyInfo.createdAt
    };
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @returns {Object|null} - User associated with API key
   */
  validateApiKey(apiKey) {
    for (const [username, user] of this.users) {
      if (user.apiKeys) {
        const keyInfo = user.apiKeys.find(k => k.key === apiKey && k.isActive);
        if (keyInfo) {
          // Update last used timestamp
          keyInfo.lastUsed = new Date().toISOString();
          
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
      }
    }
    return null;
  }

  /**
   * Get service statistics
   * @returns {Object} - Auth service statistics
   */
  getStats() {
    const totalUsers = this.users.size;
    const activeUsers = Array.from(this.users.values()).filter(u => u.isActive).length;
    const totalTokens = this.tokens.size;
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      activeTokens: totalTokens,
      uptime: process.uptime()
    };
  }

  /**
   * Clean up expired tokens (periodic maintenance)
   */
  cleanupExpiredTokens() {
    const expiredTokens = [];
    
    for (const token of this.tokens) {
      try {
        jwt.verify(token, config.jwt.secret);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          expiredTokens.push(token);
        }
      }
    }
    
    expiredTokens.forEach(token => this.tokens.delete(token));
    
    return expiredTokens.length;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Periodic cleanup of expired tokens (every hour)
setInterval(() => {
  const cleaned = authService.cleanupExpiredTokens();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired tokens`);
  }
}, 60 * 60 * 1000);

export default AuthService;