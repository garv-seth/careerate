import { createClient } from "@replit/object-storage";
import multer from "multer";
import { Express, Request, Response, NextFunction } from "express";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";

// Initialize Object Storage client
const objectStorage = createClient({
  bucket: "careerate-assets",
});

// Configure multer for file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), "tmp"));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.") as any);
    }
  },
});

// Simple text extraction for MVP
// In a production app, we would use a more robust solution like pdf.js, docx-parser, etc.
const extractTextFromFile = async (filePath: string, mimeType: string): Promise<string> => {
  // For the MVP, we'll simulate text extraction
  // In a production app, use proper libraries for each file type
  const fileContent = `Sample resume text extracted from ${path.basename(filePath)}. 
  
  EDUCATION
  - Master of Science in Computer Science, Stanford University, 2018-2020
  - Bachelor of Science in Software Engineering, MIT, 2014-2018
  
  EXPERIENCE
  - Senior Software Engineer, Tech Company, 2020-Present
    - Led development of cloud-based applications using React and Node.js
    - Implemented CI/CD pipelines improving deployment time by 40%
  
  - Software Developer, Startup Inc., 2018-2020
    - Developed RESTful APIs using Express and MongoDB
    - Implemented authentication systems with JWT
  
  SKILLS
  - Programming: JavaScript, TypeScript, Python, Java
  - Frameworks: React, Node.js, Express, Django
  - Tools: Git, Docker, AWS, CI/CD
  - Databases: MongoDB, PostgreSQL, Firebase
  
  CERTIFICATIONS
  - AWS Certified Developer
  - Google Cloud Professional Developer`;
  
  return fileContent;
};

// Upload middleware
export const uploadResume = async (req: any, res: Response, next: NextFunction) => {
  const singleUpload = upload.single("resume");
  
  singleUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const userId = req.user.claims.sub;
    const file = req.file;
    const filePath = file.path;
    
    try {
      // Extract text from resume
      const resumeText = await extractTextFromFile(filePath, file.mimetype);
      
      // Upload file to object storage
      const objectKey = `resumes/${userId}/${Date.now()}-${file.originalname}`;
      const fileStream = createReadStream(filePath);
      
      await objectStorage.put(objectKey, fileStream, {
        contentType: file.mimetype,
      });
      
      // Clean up local file
      await unlink(filePath);
      
      // Attach resume text to request for next middleware
      req.resumeText = resumeText;
      next();
    } catch (error) {
      console.error("Error processing file:", error);
      // Clean up local file in case of error
      try {
        await unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting temporary file:", unlinkError);
      }
      res.status(500).json({ message: "Error processing resume" });
    }
  });
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
