import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { InsertUser } from '@shared/schema';

/**
 * Configure passport for authentication
 */
export function configurePassport() {
  // Configure passport to use local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try to find the user by username
        const user = await storage.getUserByUsername(username);
        
        // If user not found, return error
        if (!user) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        
        // Check if password is correct
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
          return done(null, false, { message: 'Incorrect username or password' });
        }
        
        // Return user if successful
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  return passport;
}

/**
 * Register a new user
 */
export async function registerUser(username: string, password: string, email?: string): Promise<any> {
  try {
    // Check if username is already taken
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already taken');
    }
    
    // Check if email is already taken
    if (email) {
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        throw new Error('Email already taken');
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userData: InsertUser = {
      username,
      password: hashedPassword,
      email
    };
    
    const newUser = await storage.createUser(userData);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}