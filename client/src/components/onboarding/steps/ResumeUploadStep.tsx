import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingData } from '../OnboardingWizard';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ResumeUploadStepProps = {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function ResumeUploadStep({ data, updateData, onNext, onBack }: ResumeUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
    setError(null);
    
    if (!file) {
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }
    
    // Check file type
    const fileType = file.type.toLowerCase();
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(fileType)) {
      setError('Only PDF, Word documents, and text files are allowed');
      return;
    }
    
    // Show loading state
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/onboarding/upload-resume', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload resume');
      }
      
      const result = await response.json();
      
      // Update data with analysis results
      updateData({ 
        resumeFile: file,
        extractedSkills: result.analysis.skills,
        yearsOfExperience: result.analysis.yearsOfExperience,
        currentRole: result.analysis.currentRole,
        educationLevel: result.analysis.educationLevel
      });
      
      // Show success message
      toast({
        title: "Resume analyzed successfully",
        description: "We've extracted your skills and experience."
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume');
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing your resume.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = () => {
    updateData({ resumeFile: null });
  };

  const promptFileSelection = () => {
    fileInputRef.current?.click();
  };

  // Format file size for display
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} bytes`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Resume Upload</h2>
        <p className="text-muted-foreground">
          Upload your resume for AI-powered analysis of your career history and potential.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors 
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} 
                ${data.resumeFile ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={data.resumeFile ? undefined : promptFileSelection}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />

              {data.resumeFile ? (
                <div className="flex flex-col items-center">
                  <FileText size={40} className="text-primary mb-2" />
                  <div className="space-y-1">
                    <p className="font-medium">{data.resumeFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(data.resumeFile.size)}
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                  >
                    <X size={16} className="mr-2" />
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload size={40} className="text-muted-foreground mb-2" />
                  <Label className="text-lg font-medium">Drag & Drop your resume</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse (PDF, DOC, DOCX, TXT)
                  </p>
                  <Button variant="default" size="sm" className="mt-4">
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/50 rounded-md p-4">
              <h3 className="font-medium mb-2">Why upload your resume?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Get AI-powered analysis of your career history and potential</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Identify skill gaps and growth opportunities based on your experience</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Receive personalized learning paths aligned with your career goals</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Unlock insights about industry trends relevant to your experience</span>
                </li>
              </ul>
              <p className="text-sm mt-4 italic">
                Note: Resume upload is optional but recommended for best results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}