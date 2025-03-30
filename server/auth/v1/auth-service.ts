import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, InsertUser } from '@shared/schema';
import { storage } from '../../storage';

// Security constants
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';
const JWT_ALGORITHM = 'HS256';

// Use a consistent JWT secret that won't change between server restarts
// In production, this should be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'careerate-static-jwt-secret-key-for-development-env';

// Log a warning if using the default secret
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using fallback JWT secret. Set JWT_SECRET environment variable in production.');
}

/**
 * Authentication service with secure practices
 */
class AuthService {
  /**
   * Register a new user with secure password hashing
   */
  async registerUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const error = new Error('Email already registered');
        error.name = 'UserExistsError';
        throw error;
      }
      
      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      
      // Create user with secure password
      const userData: InsertUser = {
        email,
        password: hashedPassword
      };
      
      const newUser = await storage.createUser(userData);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate a user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      // Find user by email
      console.log(`[Auth Debug] Attempting to authenticate user: ${email}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`[Auth Debug] Authentication failed - No user found with email: ${email}`);
        throw new Error('Invalid email or password');
      }
      
      // Verify password with bcrypt
      console.log(`[Auth Debug] User found, verifying password...`);
      
      if (!user.password) {
        console.log(`[Auth Debug] Authentication failed - User has no password stored`);
        throw new Error('Invalid email or password');
      }
      
      console.log(`[Auth Debug] Stored hashed password: ${user.password.substring(0, 10)}...`);
      console.log(`[Auth Debug] Input password length: ${password.length}`);
      
      try {
        // Added extra try/catch for bcrypt.compare to catch any issues
        const isValid = await bcrypt.compare(password, user.password);
        console.log(`[Auth Debug] Password comparison result:`, isValid);
        
        if (!isValid) {
          console.log(`[Auth Debug] Authentication failed - Password is invalid`);
          throw new Error('Invalid email or password');
        }
      } catch (bcryptError) {
        console.error(`[Auth Debug] Bcrypt compare error:`, bcryptError);
        throw new Error('Password verification failed');
      }
      
      console.log(`[Auth Debug] Authentication successful for user: ${email}`);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      // Make sure we don't leak sensitive information in error messages
      const sanitizedError = error instanceof Error ? 
        new Error('Invalid email or password') : 
        new Error('Authentication failed');
      
      console.error('Authentication error:', error);
      throw sanitizedError;
    }
  }
  
  /**
   * Generate a JWT token for authentication
   */
  generateToken(user: Omit<User, 'password'>): string {
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
      algorithm: JWT_ALGORITHM as jwt.Algorithm
    });
  }
  
  /**
   * Verify a JWT token and return the payload
   */
  verifyToken(token: string): { userId: number; email: string } | null {
    try {
      // Improved token verification with better error handling
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
        userId: number;
        email: string;
      };
      
      // Validate that all required fields exist in the decoded token
      if (!decoded || typeof decoded !== 'object') {
        console.error('Token verification error: Decoded token is not an object');
        return null;
      }
      
      if (decoded.userId === undefined || decoded.email === undefined) {
        console.error('Token verification error: Missing required fields in payload', 
          { hasUserId: decoded.userId !== undefined, hasEmail: decoded.email !== undefined });
        return null;
      }
      
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      // Log detailed error information for debugging
      if (error instanceof jwt.JsonWebTokenError) {
        console.error(`Token verification error: ${error.name}: ${error.message}`);
      } else {
        console.error('Token verification error:', error);
      }
      return null;
    }
  }
  
  /**
   * Generate a secure random token for password reset
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export a singleton instance
export const authService = new AuthService();