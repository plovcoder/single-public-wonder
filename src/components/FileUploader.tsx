
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  onDataLoaded: (data: string[]) => void;
}

const FileUploader = ({ onDataLoaded }: FileUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    setIsLoading(true);
    
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume the first sheet is the one we want
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Extract emails/wallets from the first column
        const recipients: string[] = [];
        
        jsonData.forEach((row: any) => {
          // Get the first property value, regardless of column name
          const firstValue = Object.values(row)[0];
          if (firstValue && typeof firstValue === 'string') {
            recipients.push(firstValue.trim());
          }
        });
        
        if (recipients.length === 0) {
          toast({
            title: "No data found",
            description: "The file doesn't contain any valid emails or wallets.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "File uploaded successfully",
            description: `Found ${recipients.length} recipients`
          });
          onDataLoaded(recipients);
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Error parsing file",
          description: "Make sure the file is a valid Excel or CSV file.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fileReader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "There was an error reading the file.",
        variant: "destructive"
      });
      setIsLoading(false);
    };
    
    fileReader.readAsArrayBuffer(file);
  };
  
  return (
    <div className="flex flex-col gap-4 items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
      <input
        type="file"
        id="file-upload"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      <label 
        htmlFor="file-upload" 
        className="cursor-pointer flex flex-col items-center"
      >
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <span className="mt-2 text-base font-medium text-gray-600">
          {isLoading ? "Processing..." : "Drop Excel or CSV file here, or click to browse"}
        </span>
        <span className="mt-1 text-sm text-gray-500">
          Supports .xlsx, .xls, and .csv files
        </span>
      </label>
      {isLoading && (
        <Button disabled variant="outline" className="mt-4">
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </Button>
      )}
    </div>
  );
};

export default FileUploader;
