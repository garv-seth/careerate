import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "../OnboardingWizard";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, AlertCircle, FileCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ResumeUploadStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ResumeUploadStep({ data, updateData, onNext, onBack }: ResumeUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpdateFile(files[0]);
    }
  };

  const validateAndUpdateFile = (file: File) => {
    setError(null);
    
    // Check file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, or DOCX file.');
      return;
    }
    
    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size should be less than 5MB.');
      return;
    }
    
    updateData({ resumeFile: file });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpdateFile(files[0]);
    }
  };

  const removeFile = () => {
    updateData({ resumeFile: null });
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Resume Upload</CardTitle>
          <CardDescription>
            Upload your resume to help our AI analyze your skills and experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!data.resumeFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                Drag and drop your resume here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supports PDF, DOC, and DOCX files (max 5MB)
              </p>
              <div className="relative">
                <Input
                  type="file"
                  id="resumeFile"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Button type="button" variant="outline" className="relative z-0">
                  Browse Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Resume uploaded</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Filename: {data.resumeFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(data.resumeFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-medium flex items-center text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Why we need your resume
            </h3>
            <p className="text-sm text-muted-foreground">
              Your resume helps our AI agents analyze your work experience, skills, and accomplishments
              to provide more personalized career advice and development recommendations.
            </p>
            <p className="text-sm text-muted-foreground">
              You can skip this step, but your recommendations will be less personalized without this information.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>
            {data.resumeFile ? 'Continue' : 'Skip for now'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}