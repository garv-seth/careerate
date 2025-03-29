import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, InsertUser } from '@shared/schema';
import { storage } from '../../storage';

// Security constants
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';
const JWT_ALGORITHM = 'HS256';
const JWT_SECRET = process.env.JWT_SECRET || 'careerate-jwt-secret';

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
      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
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
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
        userId: number;
        email: string;
      };
      
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      console.error('Token verification error:', error);
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