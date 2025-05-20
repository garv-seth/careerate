import { Client } from "@replit/object-storage";
import { Express } from "express"; // Keep Express for Multer.File type
import { createReadStream } from "fs";
import { unlink, stat } from "fs/promises"; // Added stat
import path from "path";
import fs from 'fs'; // For sync operations if needed and existsSync
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Initialize Object Storage client
const objectStorage = new Client({
  bucketId: process.env.REPLIT_OBJECT_BUCKET_ID || "",
});

// Text extraction for various file types
const extractTextFromFile = async (filePath: string, mimeType: string, originalFilename: string): Promise<string> => {
  console.log(`Extracting text from file: ${filePath} with mimeType: ${mimeType}`);

  try {
    const fileBuffer = fs.readFileSync(filePath); // Read file into buffer

    if (mimeType === 'application/pdf') {
      const data = await pdf(fileBuffer);
      console.log("Successfully extracted text from PDF file");
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalFilename.endsWith('.docx')) {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      console.log("Successfully extracted text from DOCX file");
      return value;
    } else if (mimeType === 'application/msword' || originalFilename.endsWith('.doc')) {
      // Mammoth might handle some .doc files, or suggest conversion for others.
      // For simplicity, we'll try and if it fails, fallback.
      // In a real app, you might use a more robust .doc parser or an online conversion service.
      try {
        const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
        console.log("Attempted to extract text from DOC file using Mammoth");
        return value;
      } catch (docError) {
        console.warn("Mammoth could not extract text from .doc file:", docError);
        return `Unable to automatically extract text from ${originalFilename}. .doc files have limited support. Please try uploading as .docx, .pdf, or .txt.`;
      }
    } else if (mimeType === 'text/plain' || originalFilename.endsWith('.txt')) {
      const text = fileBuffer.toString('utf-8');
      console.log("Successfully extracted text from TXT file");
      return text;
    } else {
      console.warn(`Unsupported file type for direct text extraction: ${mimeType} for ${originalFilename}. Attempting generic text extraction.`);
      // Fallback for other types, try to extract printable characters
      let extractedText = "";
      for (let i = 0; i < fileBuffer.length; i++) {
        const char = fileBuffer[i];
        if (char >= 32 && char <= 126 || char === 10 || char === 13) {
          extractedText += String.fromCharCode(char);
        }
      }
      if (extractedText.trim().length > 0) {
        return `Potentially extracted text from ${originalFilename} (unknown type):

${extractedText.trim()}`;
      }
      return `Unable to extract text from ${originalFilename}. Unsupported file type: ${mimeType}. Please use PDF, DOCX, DOC, or TXT.`;
    }
  } catch (error) {
    console.error(`Error extracting text from file ${originalFilename}:`, error);
    throw new Error(`Failed to extract text from resume file: ${originalFilename}`);
  }
};

// Upload file and extract resume text
export const uploadResume = async (file: Express.Multer.File, userId: string): Promise<string> => {
  console.log("Processing resume file in object-storage.ts");
  
  if (!file || !file.path) { // Check for file.path
    throw new Error("No file or file path provided");
  }
  
  const filePath = file.path;
  const originalFilename = file.originalname; // get original filename
  console.log("Resume file path:", filePath, "Original Name:", originalFilename, "Size:", file.size, "bytes");

  try {
    // Extract text from resume
    const resumeText = await extractTextFromFile(filePath, file.mimetype, originalFilename);
    console.log("Text extracted successfully from resume:", originalFilename);

    try {
      // Upload file to object storage
      const objectKey = `resumes/${userId}/${Date.now()}-${originalFilename}`;
      // No need to createReadStream if we're uploading the original received file.
      // The file at filePath IS the temporary file we want to upload.
      
      // Check if file exists before attempting to create a stream
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
          throw new Error(`Temporary file not found or is not a file: ${filePath}`);
      }

      const fileStream = createReadStream(filePath);

      await objectStorage.uploadFromStream(objectKey, fileStream, {
        // It's generally better to let Object Storage infer content type or set it accurately.
        // contentType: file.mimetype, 
        compress: true
      });
      console.log("Resume uploaded to object storage with key:", objectKey);
    } catch (uploadError) {
      console.error("Error uploading to object storage, continuing with extracted text:", uploadError);
      // We continue even if object storage fails - the text is more important for now
    }

    // Clean up local file (temporary file)
    try {
      await unlink(filePath);
      console.log("Temporary file deleted:", filePath);
    } catch (unlinkError) {
      console.error("Error deleting temporary file:", unlinkError);
      // Non-fatal error, continue processing
    }

    return resumeText;
  } catch (error) {
    console.error(`Error processing file ${originalFilename}:`, error);
    // Clean up local file in case of error
    try {
      if (fs.existsSync(filePath)) { // Check if file exists before unlinking
         await unlink(filePath);
         console.log("Temporary file deleted during error handling:", filePath);
      }
    } catch (unlinkError) {
      console.error("Error deleting temporary file during error handling:", unlinkError);
    }
    // Propagate the error or return a specific message
    if (error instanceof Error) {
        throw new Error(`Error processing resume ${originalFilename}: ${error.message}`);
    }
    throw new Error(`Unknown error processing resume ${originalFilename}`);
  }
};

// Get resume from storage
export const getResume = async (userId: string): Promise<string | null> => {
  try {
    // This needs to be implemented to list files for the user in 'resumes/{userId}/'
    // and then fetch the latest or a selected one.
    // For now, it's a placeholder.
    console.warn("getResume function is a placeholder and does not fetch from Object Storage yet.");
    const listResults = await objectStorage.list(`resumes/${userId}/`);
    if (listResults.objects.length > 0) {
        // Sort by name to get the latest (assuming Date.now() prefix)
        listResults.objects.sort((a: { key: string }, b: { key: string }) => b.key.localeCompare(a.key));
        const latestResumeKey = listResults.objects[0].key;
        const resumeContent = await objectStorage.downloadAsText(latestResumeKey);
        console.log(`Retrieved latest resume ${latestResumeKey} for user ${userId}`);
        return resumeContent;
    }
    return "No resume found in object storage.";
  } catch (error) {
    console.error("Error retrieving resume from object storage:", error);
    return null; // Or a more specific error message
  }
};