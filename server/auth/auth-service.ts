import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { InsertUser, User } from '@shared/schema';

// Constants for security configuration
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '30d';
const HASH_ALGORITHM = 'sha512';
const JWT_ALGORITHM = 'HS512';

/**
 * Authentication service with modern security practices
 */
export class AuthService {
  private jwtSecret: string;
  
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || this.generateSecureFallbackSecret();
    if (!process.env.JWT_SECRET) {
      console.warn('WARNING: Using fallback JWT secret. Set JWT_SECRET environment variable for production.');
    }
  }
  
  /**
   * Register a new user with secure password hashing
   */
  async registerUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      // Check if email is already taken
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const error = new Error('Email already registered');
        error.name = 'UserExistsError';
        throw error;
      }
      
      // Hash password with strong parameters
      const hashedPassword = await this.hashPassword(password);
      
      // Create user with secure password
      const userData: InsertUser = {
        email,
        password: hashedPassword
      };
      
      // Insert user into database
      const newUser = await storage.createUser(userData);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error in registerUser:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate a user and return user data if successful
   */
  async authenticateUser(email: string, password: string): Promise<Omit<User, 'password'>> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new Error('Authentication failed');
      }
      
      // Verify password with timing-safe comparison
      const isValid = await this.verifyPassword(password, user.password);
      if (!isValid) {
        throw new Error('Authentication failed');
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      // Use generic error message to prevent user enumeration
      throw new Error('Authentication failed');
    }
  }
  
  /**
   * Generate a secure JWT token for the user
   */
  generateToken(user: Omit<User, 'password'>): string {
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: TOKEN_EXPIRY,
      algorithm: JWT_ALGORITHM as jwt.Algorithm
    });
  }
  
  /**
   * Verify a JWT token and return the user ID
   */
  verifyToken(token: string): { userId: number, email: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: [JWT_ALGORITHM as jwt.Algorithm]
      }) as jwt.JwtPayload;
      
      return {
        userId: parseInt(decoded.sub as string, 10),
        email: decoded.email as string
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Hash a password using bcrypt with strong parameters
   */
  async hashPassword(password: string): Promise<string> {
    // Pre-hash with SHA-512 to handle long passwords (bcrypt has 72 byte limit)
    const preHashedPassword = crypto
      .createHash(HASH_ALGORITHM)
      .update(password)
      .digest('base64');
      
    // Main bcrypt hash with high work factor
    return await bcrypt.hash(preHashedPassword, BCRYPT_ROUNDS);
  }
  
  /**
   * Verify a password against a hash using constant-time comparison
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Pre-hash with SHA-512 to match the registration process
    const preHashedPassword = crypto
      .createHash(HASH_ALGORITHM)
      .update(password)
      .digest('base64');
      
    // Verify using bcrypt's timing-safe compare
    return await bcrypt.compare(preHashedPassword, hash);
  }
  
  /**
   * Generate a secure reset token for password recovery
   */
  generateSecureToken(length = 48): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Generate a secure fallback JWT secret if none is provided
   */
  private generateSecureFallbackSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }
  
  /**
   * Generate a random secure password (for system-generated passwords)
   */
  generateSecurePassword(length = 16): string {
    const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz';
    const numberChars = '23456789';
    const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';
    
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    let password = '';
    
    // Ensure at least one char from each character set
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    
    // Fill the rest of the password with random characters
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

// Create a singleton instance
export const authService = new AuthService();