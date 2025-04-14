import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import FileUploader from "@/components/FileUploader";
import MintingTable, { MintingRecord } from "@/components/MintingTable";
import ConfigForm from "@/components/ConfigForm";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCcw } from "lucide-react";

const Index: React.FC = () => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [mintingRecords, setMintingRecords] = useState<MintingRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<{
    id?: string;
    apiKey: string;
    templateId: string;
    blockchain: string;
  }>({
    apiKey: '',
    templateId: '',
    blockchain: 'chiliz'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  const handleDataLoaded = (data: string[]) => {
    setRecipients(data);
    
    // Initialize minting records
    const records: MintingRecord[] = data.map(recipient => ({
      recipient,
      status: 'pending',
      project_id: currentProject.id
    }));
    
    setMintingRecords(records);
  };
  
  const handleProjectChange = (projectId?: string) => {
    if (!projectId) return;
    
    // Fetch project details and update current project
    const fetchProjectDetails = async () => {
      const { data, error } = await supabase
        .from('nft_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) {
        console.error('Error fetching project details:', error);
        return;
      }
      
      if (data) {
        setCurrentProject({
          id: data.id,
          apiKey: data.api_key,
          templateId: data.template_id,
          blockchain: data.blockchain
        });
        
        // Fetch minting records for this project
        const { data: mintData, error: mintError } = await supabase
          .from('nft_mints')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        if (mintError) {
          console.error('Error fetching minting records:', mintError);
          return;
        }
        
        if (mintData) {
          // Safely map the data to ensure status is of correct type
          const safeData = mintData.map((item) => ({
            ...item,
            status: item.status as 'pending' | 'minted' | 'failed',
          }));
          
          setMintingRecords(safeData);
        }
      }
    };
    
    fetchProjectDetails();
  };
  
  const handleConfigSaved = (project: { 
    id?: string; 
    api_key: string; 
    template_id: string; 
    blockchain: string 
  }) => {
    setCurrentProject({
      id: project.id,
      apiKey: project.api_key,
      templateId: project.template_id,
      blockchain: project.blockchain
    });
  };
  
  const handleManualInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualInput(e.target.value);
  };
  
  const processManualInput = () => {
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
    
    // Set recipients and initialize minting records
    setRecipients(validItems);
    
    const records: MintingRecord[] = validItems.map(recipient => ({
      recipient,
      status: 'pending',
      project_id: currentProject.id
    }));
    
    setMintingRecords(records);
    
    toast({
      title: "Recipients loaded",
      description: `${validItems.length} recipients ready to receive NFTs`
    });
  };
  
  // Actualizada la función mintNFTs para mayor claridad en los errores
  const mintNFTs = async () => {
    if (!currentProject.apiKey || !currentProject.templateId) {
      toast({
        title: "Missing configuration",
        description: "Please select a project and configure its details",
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
        template_id: currentProject.templateId,
        project_id: currentProject.id
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
            console.log(`Calling edge function for recipient: ${recipient}`);
            
            // Call our edge function with full URL
            const response = await fetch(
              `https://ikuviazxpqpbomfaucom.supabase.co/functions/v1/crossmint-nft`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  recipient,
                  apiKey: currentProject.apiKey,
                  templateId: currentProject.templateId,
                  blockchain: currentProject.blockchain
                }),
              }
            );
            
            const result = await response.json();
            console.log(`Response for ${recipient}:`, result);
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(record => {
                if (record.recipient === recipient) {
                  return {
                    ...record,
                    status: response.ok ? 'minted' : 'failed',
                    error_message: !response.ok ? (result.error?.message || "Unknown error") : undefined,
                    updated_at: new Date().toISOString()
                  };
                }
                return record;
              });
            });
            
            return { 
              recipient, 
              success: response.ok,
              error: !response.ok ? result.error : null
            };
          } catch (error) {
            console.error(`Error minting for ${recipient}:`, error);
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(record => {
                if (record.recipient === recipient) {
                  return {
                    ...record,
                    status: 'failed',
                    error_message: error.message || 'Network error',
                    updated_at: new Date().toISOString()
                  };
                }
                return record;
              });
            });
            
            return { recipient, success: false, error };
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
        description: error.message || "There was an error processing your request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Nueva función para reintento de minteos fallidos
  const retryFailedMints = async () => {
    const failedRecords = mintingRecords.filter(record => record.status === 'failed');
    
    if (failedRecords.length === 0) {
      toast({
        title: "No failed mints",
        description: "There are no failed mints to retry",
      });
      return;
    }
    
    // Extraer recipients de registros fallidos
    const failedRecipients = failedRecords.map(record => record.recipient);
    setRecipients(failedRecipients);
    
    toast({
      title: "Retrying failed mints",
      description: `Preparing to retry ${failedRecipients.length} failed mints`
    });
    
    // Actualizar registros a pending para reintentar
    const updates = failedRecords.map(async (record) => {
      return supabase
        .from('nft_mints')
        .update({ 
          status: 'pending', 
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);
    });
    
    await Promise.all(updates);
    
    // Actualizar UI
    setMintingRecords(prevRecords => 
      prevRecords.map(record => {
        if (record.status === 'failed') {
          return {
            ...record,
            status: 'pending',
            error_message: null,
            updated_at: new Date().toISOString()
          };
        }
        return record;
      })
    );
    
    // Llamar a mintNFTs para procesar nuevamente
    await mintNFTs();
  };
  
  // Nueva función para reintento individual
  const handleRetryMint = async (record: MintingRecord) => {
    if (record.status !== 'failed') return;
    
    toast({
      title: "Retrying mint",
      description: `Retrying mint for ${record.recipient}`
    });
    
    setIsLoading(true);
    
    try {
      // Actualizar estado a pending
      await supabase
        .from('nft_mints')
        .update({ 
          status: 'pending', 
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);
      
      // Actualizar en UI
      setMintingRecords(prevRecords => 
        prevRecords.map(r => {
          if (r.id === record.id) {
            return {
              ...r,
              status: 'pending',
              error_message: null,
              updated_at: new Date().toISOString()
            };
          }
          return r;
        })
      );
      
      // Llamar al edge function
      const response = await fetch(
        `https://ikuviazxpqpbomfaucom.supabase.co/functions/v1/crossmint-nft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: record.recipient,
            apiKey: currentProject.apiKey,
            templateId: currentProject.templateId || record.template_id,
            blockchain: currentProject.blockchain
          }),
        }
      );
      
      const result = await response.json();
      
      // Actualizar en UI según resultado
      setMintingRecords(prevRecords => 
        prevRecords.map(r => {
          if (r.id === record.id) {
            return {
              ...r,
              status: response.ok ? 'minted' : 'failed',
              error_message: !response.ok ? (result.error?.message || "Unknown error") : null,
              updated_at: new Date().toISOString()
            };
          }
          return r;
        })
      );
      
      // Mostrar toast con resultado
      if (response.ok) {
        toast({
          title: "Mint successful",
          description: `Successfully minted NFT for ${record.recipient}`
        });
      } else {
        toast({
          title: "Mint failed",
          description: result.error?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Error retrying mint for ${record.recipient}:`, error);
      
      // Actualizar en UI
      setMintingRecords(prevRecords => 
        prevRecords.map(r => {
          if (r.id === record.id) {
            return {
              ...r,
              status: 'failed',
              error_message: error.message || "Network error",
              updated_at: new Date().toISOString()
            };
          }
          return r;
        })
      );
      
      toast({
        title: "Error retrying mint",
        description: error.message || "There was an error processing your request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
  
  // Calcular estadísticas de minteo
  const mintingStats = {
    total: mintingRecords.length,
    minted: mintingRecords.filter(r => r.status === 'minted').length,
    pending: mintingRecords.filter(r => r.status === 'pending').length,
    failed: mintingRecords.filter(r => r.status === 'failed').length
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Crossmint NFT Sender</h1>
          <p className="text-gray-500 mt-2">
            Upload a list or paste addresses to mint and send NFTs in batch
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <ConfigForm 
              onConfigSaved={handleConfigSaved}
              onProjectChange={handleProjectChange}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Enter Recipients</CardTitle>
                <CardDescription>
                  Enter email addresses or wallet addresses below, or upload a file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentProject.blockchain && (
                  <div className="flex items-center p-2 mb-4 bg-blue-50 text-blue-700 rounded-md">
                    <AlertCircle className="h-5 w-5 mr-2" />
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
                
                {recipients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">
                      {recipients.length} recipients loaded
                    </p>
                    <Button 
                      onClick={mintNFTs} 
                      className="w-full"
                      disabled={isLoading || !currentProject.apiKey || !currentProject.templateId}
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
                
                {/* Botón para reintentar minteos fallidos */}
                {mintingStats.failed > 0 && (
                  <div className="mt-2">
                    <Button 
                      onClick={retryFailedMints} 
                      className="w-full"
                      variant="outline"
                      disabled={isLoading}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Retry {mintingStats.failed} Failed Mints
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
                  Status of your NFT minting operations for current project
                </CardDescription>
                {mintingRecords.length > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                        <span>Minted: {mintingStats.minted}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-1"></span>
                        <span>Pending: {mintingStats.pending}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                        <span>Failed: {mintingStats.failed}</span>
                      </div>
                    </div>
                    <div>Total: {mintingStats.total}</div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {mintingRecords.length > 0 ? (
                  <MintingTable records={mintingRecords} onRetry={handleRetryMint} />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>No minting operations yet</p>
                    <p className="text-sm mt-2">Enter recipients and click "Send NFTs" to start</p>
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
