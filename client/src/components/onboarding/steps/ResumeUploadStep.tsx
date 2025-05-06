import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload,
  FileUp,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Trash
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AgentAvatar } from '@/components/avatars/AgentAvatars';
import { Badge } from '@/components/ui/badge';

interface ResumeUploadStepProps {
  onFileSelect: (file: File | null) => void;
  onFileUpload: () => Promise<void>;
  uploadedFile: File | null;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  onNext: () => void;
  onBack: () => void;
  extractedSkills?: string[];
}

export function ResumeUploadStep({
  onFileSelect,
  onFileUpload,
  uploadedFile,
  isUploading,
  uploadError,
  uploadSuccess,
  onNext,
  onBack,
  extractedSkills = []
}: ResumeUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  // Handle button click to open file dialog
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file clear
  const handleClearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AgentAvatar agent="maya" size="md" status={isUploading ? 'active' : (uploadSuccess ? 'complete' : 'idle')} />
        <div>
          <h2 className="text-xl font-semibold">Upload Your Resume</h2>
          <p className="text-muted-foreground">
            Let Maya analyze your resume to provide personalized career insights
          </p>
        </div>
      </div>

      {/* Drag and drop area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/20'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        
        {!uploadedFile ? (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p>Drag and drop your resume file, or</p>
              <Button 
                variant="outline" 
                onClick={handleButtonClick}
                className="mt-2"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-medium">{uploadedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({Math.round(uploadedFile.size / 1024)} KB)
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClearFile}
                disabled={isUploading}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            
            {!uploadSuccess && (
              <Button 
                onClick={onFileUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Success message and detected skills */}
      {uploadSuccess && (
        <div className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Resume analysis complete! Maya has identified the following skills:
            </AlertDescription>
          </Alert>
          
          {extractedSkills && extractedSkills.length > 0 ? (
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Identified Skills</h3>
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((skill, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="bg-primary/10 hover:bg-primary/20"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                You'll be able to refine these skills in the final step of the onboarding process.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No specific skills were identified. You'll have a chance to add your skills manually later.
            </p>
          )}
        </div>
      )}

      {/* Skip message */}
      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>Resume upload is optional. You can still get personalized career guidance without it.</p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          {uploadSuccess ? 'Continue' : 'Skip for now'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}