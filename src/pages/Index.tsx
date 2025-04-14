
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import FileUploader from "@/components/FileUploader";
import MintingTable, { MintingRecord } from "@/components/MintingTable";
import ConfigForm from "@/components/ConfigForm";
import { supabase } from "@/integrations/supabase/client";

const Index: React.FC = () => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [mintingRecords, setMintingRecords] = useState<MintingRecord[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleDataLoaded = (data: string[]) => {
    setRecipients(data);
    
    // Initialize minting records
    const records: MintingRecord[] = data.map(recipient => ({
      recipient,
      status: 'pending'
    }));
    
    setMintingRecords(records);
  };
  
  const handleConfigSaved = (newApiKey: string, newTemplateId: string) => {
    setApiKey(newApiKey);
    setTemplateId(newTemplateId);
  };
  
  const mintNFTs = async () => {
    if (!apiKey || !templateId) {
      toast({
        title: "Missing configuration",
        description: "Please enter your API Key and Template ID",
        variant: "destructive"
      });
      return;
    }
    
    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please upload a file with recipient emails or wallets",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, insert all records into the database
      const recordsToInsert = recipients.map(recipient => ({
        recipient,
        status: 'pending',
        template_id: templateId
      }));
      
      const { data, error } = await supabase
        .from('nft_mints')
        .insert(recordsToInsert)
        .select();
      
      if (error) throw error;
      
      // Update local state with the inserted records
      if (data) {
        setMintingRecords(data as MintingRecord[]);
      }
      
      // Process minting in parallel with a concurrency limit
      const concurrencyLimit = 5; // Process 5 at a time
      const mintPromises = [];
      
      for (let i = 0; i < recipients.length; i += concurrencyLimit) {
        const batch = recipients.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (recipient) => {
          try {
            // Call our edge function
            const response = await fetch(
              `https://ikuviazxpqpbomfaucom.supabase.co/functions/v1/crossmint-nft`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  recipient,
                  apiKey,
                  templateId
                }),
              }
            );
            
            const result = await response.json();
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(record => {
                if (record.recipient === recipient) {
                  return {
                    ...record,
                    status: response.ok ? 'minted' : 'failed',
                    error_message: !response.ok ? result.error?.message : undefined
                  };
                }
                return record;
              });
            });
            
            return { recipient, success: response.ok };
          } catch (error) {
            console.error(`Error minting for ${recipient}:`, error);
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(record => {
                if (record.recipient === recipient) {
                  return {
                    ...record,
                    status: 'failed',
                    error_message: 'Network error'
                  };
                }
                return record;
              });
            });
            
            return { recipient, success: false };
          }
        });
        
        mintPromises.push(...batchPromises);
        
        // Wait for the current batch to complete before processing the next one
        await Promise.all(batchPromises);
      }
      
      // Wait for all minting to complete
      const results = await Promise.all(mintPromises);
      
      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Minting completed",
        description: `Successfully minted ${successCount} NFTs, ${failureCount} failed.`
      });
    } catch (error) {
      console.error('Error in minting process:', error);
      toast({
        title: "Error in minting process",
        description: "There was an error processing your request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Crossmint NFT Sender</h1>
          <p className="text-gray-500 mt-2">
            Upload a list of emails or wallet addresses to mint and send NFTs in batch
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <ConfigForm onConfigSaved={handleConfigSaved} />
            
            <Card>
              <CardHeader>
                <CardTitle>Upload Recipients</CardTitle>
                <CardDescription>
                  Upload an Excel or CSV file with emails or wallet addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader onDataLoaded={handleDataLoaded} />
                
                {recipients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      {recipients.length} recipients loaded
                    </p>
                    <Button 
                      onClick={mintNFTs} 
                      className="w-full"
                      disabled={isLoading || !apiKey || !templateId}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Minting in progress...
                        </>
                      ) : "Send NFTs"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Minting Results</CardTitle>
                <CardDescription>
                  Status of your NFT minting operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mintingRecords.length > 0 ? (
                  <MintingTable records={mintingRecords} />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>No minting operations yet</p>
                    <p className="text-sm mt-2">Upload a file and click "Send NFTs" to start</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
