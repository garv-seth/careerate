import { Client } from "@replit/object-storage";
import multer from "multer";
import { Express, Request, Response, NextFunction } from "express";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";

// Initialize Object Storage client
const objectStorage = new Client({
  bucketId: process.env.REPLIT_OBJECT_BUCKET_ID || "",
});

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = path.join(process.cwd(), "tmp");
      // Ensure directory exists
      import('fs').then(fs => {
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
          console.log("Created tmp directory for uploads:", tmpDir);
        }
        cb(null, tmpDir);
      }).catch(err => {
        console.error("Error ensuring tmp directory exists:", err);
        cb(err, tmpDir);
      });
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("Filtering file:", file.originalname, "Mimetype:", file.mimetype);

    // Check file types - be more lenient with MIME types
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream"  // Allow generic binary type
    ];

    // Check by extension as well for better compatibility
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
    }
  },
});

// Text extraction for various file types
// This is a simplified version that handles TXT files directly
// and returns content for other types
const extractTextFromFile = async (filePath: string, mimeType: string): Promise<string> => {
  console.log(`Extracting text from file: ${filePath} with mimeType: ${mimeType}`);

  try {
    const fs = await import('fs');

    // For text files, read directly
    if (mimeType === 'text/plain') {
      const text = fs.readFileSync(filePath, 'utf-8');
      console.log("Successfully extracted text from TXT file");
      return text;
    }

    // For PDF, DOCX, etc. we would normally use specialized libraries
    // For now, if not plaintext, we use a simplified approach - in production,
    // we would integrate PDF.js, mammoth.js, etc. for proper extraction

    // Log file size for debugging
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);

    // Simplified extraction for MVP - just reads first 2KB as text
    const buffer = fs.readFileSync(filePath);
    let extractedText = "";

    // Try to extract readable text from binary files
    for (let i = 0; i < Math.min(buffer.length, 2048); i++) {
      const char = buffer[i];
      // Only include printable ASCII characters
      if (char >= 32 && char <= 126) {
        extractedText += String.fromCharCode(char);
      }
      else if (char === 10 || char === 13) {
        // Include newlines
        extractedText += '\n';
      }
    }

    if (extractedText.length > 0) {
      console.log("Extracted some readable text from binary file");
      return `Extracted text from ${path.basename(filePath)}:\n\n${extractedText}`;
    } else {
      console.log("Could not extract readable text, using a placeholder");
      // Fallback to a placeholder asking for plain text
      return `Unable to fully extract text from ${path.basename(filePath)}. 
      Please upload a plain text version of your resume for best results.`;
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw new Error("Failed to extract text from resume file");
  }
};

// Upload file and extract resume text
export const uploadResume = async (file: Express.Multer.File, userId: string): Promise<string> => {
  console.log("Processing resume file");
  
  if (!file) {
    throw new Error("No file provided");
  }
  
  const filePath = file.path;
  console.log("Resume file path:", filePath, "Size:", file.size, "bytes");

  try {
    // Extract text from resume
    const resumeText = await extractTextFromFile(filePath, file.mimetype);
    console.log("Text extracted successfully from resume");

    try {
      // Upload file to object storage
      const objectKey = `resumes/${userId}/${Date.now()}-${file.originalname}`;
      const fileStream = createReadStream(filePath);

      await objectStorage.uploadFromStream(objectKey, fileStream, {
        compress: true
      });
      console.log("Resume uploaded to object storage with key:", objectKey);
    } catch (uploadError) {
      console.error("Error uploading to object storage, continuing with extracted text:", uploadError);
      // We continue even if object storage fails - the text is more important
    }

    // Clean up local file
    try {
      await unlink(filePath);
      console.log("Temporary file deleted:", filePath);
    } catch (unlinkError) {
      console.error("Error deleting temporary file:", unlinkError);
      // Non-fatal error, continue processing
    }

    return resumeText;
  } catch (error) {
    console.error("Error processing file:", error);
    // Clean up local file in case of error
    try {
      await unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting temporary file:", unlinkError);
    }
    throw new Error("Error processing resume");
  }
};

// Get resume from storage
export const getResume = async (userId: string): Promise<string | null> => {
  try {
    // In a real implementation, we would fetch the actual file
    // For the MVP, we'll use the data stored in the database
    return "Resume content would be retrieved from object storage in a production environment.";
  } catch (error) {
    console.error("Error retrieving resume:", error);
    return null;
  }
};