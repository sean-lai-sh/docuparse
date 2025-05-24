'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';

declare const Buffer: any; // Declare Buffer for browser environment

interface PDFUploaderProps {
  onFileProcessed: (htmlPath: string) => void;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onFileProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }


    // Validate file size (e.g., 10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Read the file as base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      });

      // First, upload the file to get a URL
      const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
        method: 'POST',
        headers: {
          'x-api-key': String(process.env.PDFCO_API_KEY),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: `data:application/pdf;base64,${fileBase64}`,
          name: file.name,
          async: false
        }),
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.url) {
        throw new Error(uploadData.message || 'Failed to upload file');
      }

      // Now convert the uploaded PDF to HTML
      const convertResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/html', {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: uploadData.url,
          inline: true,
          async: false,
          name: file.name.replace(/\.pdf$/i, '.html')
        }),
      });

      const convertData = await convertResponse.json();

      if (!convertResponse.ok || !convertData.url) {
        throw new Error(convertData.message || 'Failed to convert PDF to HTML');
      }

      // Download the HTML file with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const htmlResponse = await fetch(convertData.url, { signal: controller.signal });
        
        if (!htmlResponse.ok) {
          throw new Error(`Failed to download HTML: ${htmlResponse.statusText}`);
        }

        const htmlContent = await htmlResponse.text();

        // Create a blob URL for the HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(blob);

        // Notify parent component with the HTML URL
        onFileProcessed(htmlUrl);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Failed to process HTML: ${error.message}`);
        }
        throw new Error('An unknown error occurred while processing the HTML');
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-blue-100 rounded-full">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Upload a PDF</h2>
        <p className="text-sm text-gray-500 text-center">
          Upload a PDF file to convert it to HTML and view it in the browser.
        </p>
        
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`px-6 py-3 rounded-md flex items-center space-x-2 ${
            isUploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Select PDF File</span>
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-2">
          Supported format: .pdf (max 10MB)
        </p>
      </div>
    </div>
  );
};

export default PDFUploader;
