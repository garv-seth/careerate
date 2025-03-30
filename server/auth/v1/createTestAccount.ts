import bcrypt from 'bcryptjs';
import { storage } from '../../storage';

// Ensure we have a test account for development
export async function ensureTestAccount() {
  try {
    const email = 'test@example.com';
    const password = 'password123';
    
    // Check if user exists
    const existingUser = await storage.getUserByEmail(email);
    if (!existingUser) {
      console.log('Creating test account for development...');
      // Create a test user for development
      const hashedPassword = await bcrypt.hash(password, 12);
      await storage.createUser({
        email,
        password: hashedPassword
      });
      console.log('Test account created with email: test@example.com and password: password123');
    } else {
      console.log('Test account already exists');
    }
  } catch (error) {
    console.error('Error creating test account:', error);
  }
}