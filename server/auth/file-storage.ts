import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Convert fs functions to promise-based
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Define uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Make sure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Upload a file to local storage
 * This is a simplified version that stores files locally instead of using Replit Object Storage
 */
export async function uploadFile(
  fileData: Buffer, 
  fileName: string, 
  userId: number
): Promise<{ url: string, key: string }> {
  try {
    // Create user directory if it doesn't exist
    const userDir = path.join(UPLOADS_DIR, `user_${userId}`);
    if (!fs.existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }
    
    // Generate a unique filename
    const extension = fileName.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}.${extension}`;
    const filePath = path.join(userDir, uniqueFilename);
    
    // Write the file to disk
    await writeFile(filePath, fileData);
    
    // Create a relative URL path
    const key = `user_${userId}/${uniqueFilename}`;
    const url = `/uploads/${key}`;
    
    return {
      url,
      key
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Download a file from a URL
 */
export async function downloadFileFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading file from URL:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Save uploaded file temporarily to disk
 */
export async function saveTempFile(fileData: Buffer, extension: string): Promise<string> {
  try {
    const tempFileName = `./temp-${uuidv4()}.${extension}`;
    
    await writeFile(tempFileName, fileData);
    
    return tempFileName;
  } catch (error) {
    console.error('Error saving temporary file:', error);
    throw new Error('Failed to save temporary file');
  }
}

/**
 * Read file from disk and then delete it
 */
export async function readAndDeleteTempFile(filePath: string): Promise<Buffer> {
  try {
    const fileData = await readFile(filePath);
    
    // Delete the file
    await unlink(filePath);
    
    return fileData;
  } catch (error) {
    console.error('Error reading temporary file:', error);
    throw new Error('Failed to read temporary file');
  }
}

/**
 * Check if file is a PDF
 */
export function isPDF(buffer: Buffer): boolean {
  // PDF files start with %PDF
  return buffer.toString('ascii', 0, 4) === '%PDF';
}

/**
 * Extract text from a PDF using external service (simulated)
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // This is a simple placeholder that would be replaced with an actual PDF extraction service
    // In a real implementation, you might use a PDF parsing library or an external service
    
    // Example extraction logic (this doesn't really extract text):
    const firstFewBytes = pdfBuffer.toString('ascii', 0, 100);
    if (!firstFewBytes.includes('%PDF')) {
      throw new Error('Not a valid PDF file');
    }
    
    // Since we can't actually extract text, return a simple placeholder
    // In real implementation, you'd return the actual extracted text
    return "This is placeholder text extracted from the PDF. In a real implementation, you would use a PDF parsing library or service to extract the actual text content from the PDF document.";
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}