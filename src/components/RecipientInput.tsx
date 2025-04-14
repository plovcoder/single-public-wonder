
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import FileUploader from "@/components/FileUploader";
import { RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MintingRecord } from "@/components/MintingTable";

interface RecipientInputProps {
  currentProject: {
    id?: string;
    apiKey: string;
    templateId: string;
    blockchain: string;
  };
  onRecipientsLoaded: (records: MintingRecord[]) => void;
  failedMintCount: number;
  isLoading: boolean;
  onRetryFailedMints: () => void;
}

const RecipientInput: React.FC<RecipientInputProps> = ({
  currentProject,
  onRecipientsLoaded,
  failedMintCount,
  isLoading,
  onRetryFailedMints
}) => {
  const [manualInput, setManualInput] = useState('');

  const handleManualInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualInput(e.target.value);
  };

  const processManualInput = async () => {
    if (!manualInput.trim()) {
      toast({
        title: "No recipients entered",
        description: "Please enter at least one email or wallet address",
        variant: "destructive"
      });
      return;
    }
    
    // Split by commas, newlines, or spaces and filter out empty entries
    const items = manualInput
      .split(/[\s,]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    // Validate each item as email or wallet address (simple validation)
    const validItems = items.filter(item => {
      const isEmail = item.includes('@') && item.includes('.');
      const isWallet = item.length >= 30; // Simple check for wallet length
      return isEmail || isWallet;
    });
    
    if (validItems.length === 0) {
      toast({
        title: "No valid recipients found",
        description: "Please enter valid email addresses or wallet addresses",
        variant: "destructive"
      });
      return;
    }
    
    // Initialize records
    const newRecords: MintingRecord[] = [];
    
    // If we have a project ID, save these records to the database
    if (currentProject.id) {
      // Save each record to Supabase
      for (const recipient of validItems) {
        const { data, error } = await supabase
          .from('nft_mints')
          .insert({
            recipient: recipient,
            status: 'pending',
            project_id: currentProject.id,
            template_id: currentProject.templateId
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving minting record:', error);
          // Still add to local state with a temporary ID
          newRecords.push({
            id: `temp-${Date.now()}-${recipient}`,
            recipient,
            status: 'pending',
            project_id: currentProject.id
          });
        } else if (data) {
          newRecords.push(data as MintingRecord);
        }
      }
    } else {
      // No project ID, just use temporary records
      validItems.forEach((recipient, index) => {
        newRecords.push({
          id: `temp-${Date.now()}-${index}`,
          recipient,
          status: 'pending',
          project_id: currentProject.id
        });
      });
    }
    
    // Update the parent component with the new records
    onRecipientsLoaded(newRecords);
    
    toast({
      title: "Recipients loaded",
      description: `${validItems.length} recipients ready to receive NFTs`
    });
    
    // Clear the input
    setManualInput('');
  };

  const handleDataLoaded = async (data: string[]) => {
    // Initialize minting records
    const records: MintingRecord[] = data.map(recipient => ({
      recipient,
      status: 'pending',
      project_id: currentProject.id
    }));
    
    // If we have a project ID, save these records to the database
    if (currentProject.id) {
      // Save each record to Supabase
      const savedRecords = [];
      
      for (const record of records) {
        const { data, error } = await supabase
          .from('nft_mints')
          .insert({
            recipient: record.recipient,
            status: 'pending',
            project_id: currentProject.id,
            template_id: currentProject.templateId
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error saving minting record:', error);
        } else if (data) {
          savedRecords.push(data);
        }
      }
      
      // Update the UI with the saved records that include IDs
      if (savedRecords.length > 0) {
        onRecipientsLoaded(savedRecords);
        return;
      }
    }
    
    // If we got here, either there's no project ID or saving to DB failed
    onRecipientsLoaded(records);
  };

  const getBlockchainDisplayName = (chain: string) => {
    switch (chain) {
      case 'solana': return 'Solana';
      case 'polygon-amoy': return 'Polygon-Amoy';
      case 'ethereum-sepolia': return 'Ethereum-Sepolia';
      case 'chiliz': return 'Chiliz';
      default: return chain.charAt(0).toUpperCase() + chain.slice(1);
    }
  };

  return (
    <div className="space-y-4">
      {currentProject.blockchain && (
        <div className="flex items-center p-2 mb-4 bg-blue-50 text-blue-700 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="text-sm font-medium">
            🔗 Minting on: {getBlockchainDisplayName(currentProject.blockchain)}
          </p>
        </div>
      )}
      
      <div>
        <Textarea 
          placeholder="Paste wallet addresses or emails (one per line or comma/space separated)" 
          className="min-h-[100px]"
          value={manualInput}
          onChange={handleManualInputChange}
        />
        <Button 
          onClick={processManualInput} 
          className="mt-2 w-full"
          variant="secondary"
          disabled={!currentProject.id}
        >
          Process Recipients
        </Button>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      
      <FileUploader onDataLoaded={handleDataLoaded} />
      
      {failedMintCount > 0 && (
        <div className="mt-2">
          <Button 
            onClick={onRetryFailedMints} 
            className="w-full"
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry {failedMintCount} Failed Mints
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecipientInput;
