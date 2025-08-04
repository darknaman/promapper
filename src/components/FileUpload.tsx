import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import Papa from 'papaparse';

interface FileUploadProps {
  title: string;
  description: string;
  onFileUpload: (data: any[], fileName: string) => void;
  expectedHeaders?: string[];
  isLoading?: boolean;
  uploadedFileName?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  title,
  description,
  onFileUpload,
  expectedHeaders = [],
  isLoading = false,
  uploadedFileName
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }

        if (results.data.length === 0) {
          setError('The CSV file is empty');
          return;
        }

        // Check for expected headers if provided
        if (expectedHeaders.length > 0) {
          const actualHeaders = Object.keys(results.data[0] as object);
          const missingHeaders = expectedHeaders.filter(
            header => !actualHeaders.includes(header)
          );

          if (missingHeaders.length > 0) {
            setError(`Missing required columns: ${missingHeaders.join(', ')}`);
            return;
          }
        }

        onFileUpload(results.data, file.name);
      },
      error: (error) => {
        setError(`File reading error: ${error.message}`);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-primary bg-upload-zone' 
            : uploadedFileName 
              ? 'border-success bg-success/5' 
              : 'border-border bg-upload-zone/50 hover:bg-upload-zone/80'
          }
          ${error ? 'border-destructive bg-destructive/5' : ''}
          cursor-pointer
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          {uploadedFileName ? (
            <CheckCircle2 className="h-12 w-12 text-success" />
          ) : error ? (
            <AlertCircle className="h-12 w-12 text-destructive" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}

          {uploadedFileName ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-success">File uploaded successfully!</p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{uploadedFileName}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Drop the CSV file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
              {expectedHeaders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Required columns: {expectedHeaders.join(', ')}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {uploadedFileName && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className="w-full mt-4"
        >
          Upload Different File
        </Button>
      )}
    </Card>
  );
};

export default FileUpload;