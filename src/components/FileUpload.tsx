import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { CsvWorkerManager, CsvWorkerProgress } from '../utils/csvWorkerManager';

interface FileUploadProps {
  title: string;
  description: string;
  expectedHeaders: string[];
  onFileUpload: (data: any[], fileName: string) => void;
  uploadedFileName?: string;
  fileType?: 'products' | 'hierarchy';
}

const FileUpload: React.FC<FileUploadProps> = ({
  title,
  description,
  expectedHeaders,
  onFileUpload,
  uploadedFileName,
  fileType = 'products'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CsvWorkerProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const workerManagerRef = useRef<CsvWorkerManager | null>(null);

  // Initialize worker manager
  if (!workerManagerRef.current) {
    workerManagerRef.current = new CsvWorkerManager();
  }

  /**
   * Enhanced file processing with Web Worker support and progress tracking
   */
  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress({ progress: 0 });

    try {
      const workerManager = workerManagerRef.current;

      // Try Web Worker first, fallback to main thread if not available
      if (workerManager && workerManager.isWorkerAvailable() && file.size > 1024 * 1024) { // Use worker for files > 1MB
        const result = await workerManager.parseCsvFile(
          file,
          expectedHeaders,
          fileType,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        onFileUpload(result.data as any[], file.name);
        
        toast({
          title: "File processed successfully",
          description: `Processed ${result.data.length} rows using Web Worker for optimal performance.`,
        });
      } else {
        // Fallback to main thread with chunked processing
        await processFileMainThread(file);
      }
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  }, [expectedHeaders, fileType, onFileUpload, toast]);

  const processFileMainThread = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const results: any[] = [];
      let totalRows = 0;
      let processedRows = 0;
      let isFirstChunk = true;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunk: function(chunk) {
          if (isFirstChunk) {
            // Estimate total rows from first chunk
            const estimatedTotal = Math.round((file.size / chunk.data.length) * chunk.data.length);
            totalRows = estimatedTotal;
            isFirstChunk = false;
          }
          
          // Process chunk data immediately
          const processedChunk = chunk.data.map((row: any, index: number) => {
            if (fileType === 'products') {
              return {
                id: row.id || row.ID || `product-${processedRows + index}`,
                title: row.title || row.Title || '',
                brand: row.brand || row.Brand || '',
                url: row.url || row.URL || '',
                category: undefined,
                subcategory: undefined,
                bigC: undefined,
                smallC: undefined,
                segment: undefined,
                subSegment: undefined
              };
            } else {
              return {
                category: row.category || '',
                subcategory: row.subcategory || '',
                bigC: row.bigC || '',
                smallC: row.smallC || '',
                segment: row.segment || '',
                subSegment: row.subSegment || ''
              };
            }
          });

          results.push(...processedChunk);
          processedRows += chunk.data.length;

          // Update progress more accurately
          const progress = Math.min(Math.round((processedRows / Math.max(totalRows, processedRows)) * 100), 100);
          setUploadProgress({
            progress,
            processedRows,
            totalRows: Math.max(totalRows, processedRows)
          });

          // Yield control to keep UI responsive
          setTimeout(() => {}, 0);
        },
        complete: function() {
          console.log('Main thread parsing complete. Total results:', results.length);
          onFileUpload(results, file.name);
          
          toast({
            title: "File processed successfully",
            description: `Processed ${results.length} rows.`,
          });
          
          resolve();
        },
        error: function(error) {
          console.error('Main thread parsing error:', error);
          reject(error);
        }
      });
    });
  }, [fileType, onFileUpload, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <Card className="p-6 transition-all duration-200 hover:shadow-lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        {/* File upload area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
            ${isDragOver 
              ? 'border-primary bg-primary/5 scale-105' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30'
            }
            ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                <div>
                  <p className="text-lg font-medium text-foreground">Processing file...</p>
                  {uploadProgress && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Progress: {uploadProgress.progress}%</span>
                        {uploadProgress.processedRows && uploadProgress.totalRows && (
                          <span>{uploadProgress.processedRows.toLocaleString()} / {uploadProgress.totalRows.toLocaleString()} rows</span>
                        )}
                      </div>
                      <Progress value={uploadProgress.progress} className="h-2" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {isDragOver ? 'Drop your CSV file here' : 'Drop CSV file or click to browse'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: 50MB. Large files will be processed using Web Workers for optimal performance.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expected headers */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Expected CSV headers:</p>
          <div className="flex flex-wrap gap-1">
            {expectedHeaders.map((header, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>

        {/* Upload status */}
        {uploadedFileName && (
          <div className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">File uploaded successfully</p>
              <p className="text-xs text-success/80">{uploadedFileName}</p>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv"
          className="hidden"
          disabled={isProcessing}
        />
      </div>
    </Card>
  );
};

export default FileUpload;
