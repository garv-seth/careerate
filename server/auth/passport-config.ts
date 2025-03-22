import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { InsertUser } from '@shared/schema';

/**
 * Configure passport for authentication
 */
export function configurePassport() {
  // Configure passport to use local strategy with custom fields
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Use email field for authentication
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          // Try to find the user by email
          const user = await storage.getUserByEmail(email);
          
          // If user not found, return error
          if (!user) {
            return done(null, false, { message: 'Incorrect email or password' });
          }
          
          // Check if password is correct
          const isValid = await bcrypt.compare(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: 'Incorrect email or password' });
          }
          
          // Return user if successful
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
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
 * Register a new user with email
 */
export async function registerUser(email: string, password: string): Promise<any> {
  try {
    // Check if email is already taken
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email already taken');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with email as the identifier
    const userData: InsertUser = {
      email,
      password: hashedPassword
    };
    
    const newUser = await storage.createUser(userData);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}