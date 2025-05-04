import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { OnboardingData } from '../OnboardingWizard';
import { Button } from '@/components/ui/button';
import { FileUp, FileText, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeUploadStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export function ResumeUploadStep({ data, updateData }: ResumeUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateData({ resumeFile: file });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.doc') || file.name.endsWith('.docx'))) {
      updateData({ resumeFile: file });
    }
  };

  const handleRemoveFile = () => {
    updateData({ resumeFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      className="py-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-2">Resume Upload</h2>
      <p className="text-muted-foreground mb-6">
        Upload your resume to help us better understand your career background.
        This allows us to provide more accurate recommendations and insights.
      </p>
      
      {!data.resumeFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          
          <FileUp size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Drag and drop your resume</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Supports PDF, DOC, or DOCX files
          </p>
          <Button type="button">
            Browse Files
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FileText size={24} className="text-primary" />
            </div>
            
            <div className="flex-grow">
              <div className="font-medium">{data.resumeFile.name}</div>
              <div className="text-sm text-muted-foreground">
                {(data.resumeFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center text-sm text-green-600 gap-1">
                <Check size={16} />
                Uploaded
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleRemoveFile}
                className="text-destructive"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 bg-muted/40 p-4 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Why upload your resume?</h3>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>Get more accurate career path recommendations</li>
          <li>Identify skill gaps based on your actual experience</li>
          <li>Receive tailored learning resources for your industry</li>
          <li>Help our AI understand your career progression</li>
        </ul>
      </div>
    </motion.div>
  );
}