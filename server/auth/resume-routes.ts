import { Router, Response, Request } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from './v1/auth-middleware';
import { uploadFile, isPDF, extractTextFromPDF } from './file-storage';
import { extractSkillsFromResume, saveResumeUrl } from './resume-processor';

// Extend the AuthenticatedRequest to include the multer file
interface MulterAuthenticatedRequest extends AuthenticatedRequest {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
    fieldname: string;
    encoding: string;
  };
}

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Upload resume
router.post('/resume', requireAuth, upload.single('resume'), async (req: MulterAuthenticatedRequest, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    // Get file data
    const fileData = req.file.buffer;
    const originalName = req.file.originalname;
    
    // Verify it's a PDF
    if (!isPDF(fileData)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PDF file'
      });
    }
    
    // Get user ID
    const userId = (req.user as any).id;
    
    // Upload to object storage
    const { url } = await uploadFile(fileData, originalName, userId);
    
    // Save resume URL to user profile
    await saveResumeUrl(userId, url);
    
    // Extract text from PDF
    const pdfText = await extractTextFromPDF(fileData);
    
    // Extract skills from resume text
    const skills = await extractSkillsFromResume(pdfText, userId);
    
    res.json({
      success: true,
      resumeUrl: url,
      extractedSkills: skills,
      message: 'Resume uploaded and skills extracted'
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process resume'
    });
  }
});

export default router;