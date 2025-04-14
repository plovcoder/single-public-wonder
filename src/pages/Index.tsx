import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import FileUploader from "@/components/FileUploader";
import MintingTable, { MintingRecord } from "@/components/MintingTable";
import ConfigForm from "@/components/ConfigForm";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCcw, CheckSquare, Square, Check, Trash2 } from "lucide-react";

const Index: React.FC = () => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [mintingRecords, setMintingRecords] = useState<MintingRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
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
  
  // Load records from Supabase on initial page load
  useEffect(() => {
    const loadInitialRecords = async () => {
      // Get the most recent project
      const { data: projectData, error: projectError } = await supabase
        .from('nft_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (projectError) {
        console.error('Error fetching most recent project:', projectError);
        return;
      }
      
      if (projectData && projectData.length > 0) {
        const project = projectData[0];
        setCurrentProject({
          id: project.id,
          apiKey: project.api_key,
          templateId: project.template_id,
          blockchain: project.blockchain
        });
        
        // Load minting records for this project
        const { data: mintData, error: mintError } = await supabase
          .from('nft_mints')
          .select('*')
          .eq('project_id', project.id)
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
    
    loadInitialRecords();
  }, []);
  
  const handleDataLoaded = async (data: string[]) => {
    setRecipients(data);
    
    // Initialize minting records
    const records: MintingRecord[] = data.map(recipient => ({
      recipient,
      status: 'pending',
      project_id: currentProject.id
    }));
    
    setMintingRecords(records);
    setSelectedRecords([]); // Clear selections
    
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
        setMintingRecords(savedRecords);
      }
    }
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
          setSelectedRecords([]); // Clear selections
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
    
    // Set recipients
    setRecipients(validItems);
    
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
    
    // Update the minting records state
    setMintingRecords(newRecords);
    setSelectedRecords([]); // Clear selections
    
    toast({
      title: "Recipients loaded",
      description: `${validItems.length} recipients ready to receive NFTs`
    });
  };
  
  // Handle selection of a record
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, recordId]);
    } else {
      setSelectedRecords(prev => prev.filter(id => id !== recordId));
    }
  };
  
  // Handle select all pending records
  const handleSelectAllPending = () => {
    const pendingRecordIds = mintingRecords
      .filter(record => record.status === 'pending')
      .map(record => record.id || '');
    
    // Filter out any undefined IDs
    const validIds = pendingRecordIds.filter(id => id !== '');
    
    setSelectedRecords(validIds);
    
    toast({
      title: "Selected all pending",
      description: `Selected ${validIds.length} pending records`
    });
  };
  
  // Handle mint selected
  const mintSelected = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "No records selected",
        description: "Please select at least one record to mint",
        variant: "destructive"
      });
      return;
    }
    
    if (!currentProject.apiKey || !currentProject.templateId) {
      toast({
        title: "Missing configuration",
        description: "Please select a project and configure its details",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the selected records
      const selectedMintingRecords = mintingRecords.filter(record => 
        selectedRecords.includes(record.id || '')
      );
      
      // Filter to only get pending records
      const pendingSelectedRecords = selectedMintingRecords.filter(record => 
        record.status === 'pending'
      );
      
      if (pendingSelectedRecords.length === 0) {
        toast({
          title: "No pending records selected",
          description: "Please select at least one pending record to mint",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Minting started",
        description: `Starting to mint ${pendingSelectedRecords.length} NFTs`
      });
      
      // Process minting in parallel with a concurrency limit
      const concurrencyLimit = 5; // Process 5 at a time
      const mintPromises = [];
      
      for (let i = 0; i < pendingSelectedRecords.length; i += concurrencyLimit) {
        const batch = pendingSelectedRecords.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (record) => {
          try {
            console.log(`Calling edge function for recipient: ${record.recipient}`);
            
            // Call our edge function with full URL
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
                  templateId: currentProject.templateId,
                  blockchain: currentProject.blockchain
                }),
              }
            );
            
            const result = await response.json();
            console.log(`Response for ${record.recipient}:`, result);
            
            // Update record in database if it has an ID
            if (record.id && !record.id.startsWith('temp-')) {
              await supabase
                .from('nft_mints')
                .update({
                  status: response.ok ? 'minted' : 'failed',
                  error_message: !response.ok ? (result.error?.message || "Unknown error") : null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', record.id);
            }
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(r => {
                if (r.id === record.id) {
                  return {
                    ...r,
                    status: response.ok ? 'minted' : 'failed',
                    error_message: !response.ok ? (result.error?.message || "Unknown error") : undefined,
                    updated_at: new Date().toISOString()
                  };
                }
                return r;
              });
            });
            
            return { 
              recipient: record.recipient, 
              success: response.ok,
              error: !response.ok ? result.error : null
            };
          } catch (error) {
            console.error(`Error minting for ${record.recipient}:`, error);
            
            // Update record in database if it has an ID
            if (record.id && !record.id.startsWith('temp-')) {
              await supabase
                .from('nft_mints')
                .update({
                  status: 'failed',
                  error_message: error.message || 'Network error',
                  updated_at: new Date().toISOString()
                })
                .eq('id', record.id);
            }
            
            // Update the record in our local state
            setMintingRecords(prevRecords => {
              return prevRecords.map(r => {
                if (r.id === record.id) {
                  return {
                    ...r,
                    status: 'failed',
                    error_message: error.message || 'Network error',
                    updated_at: new Date().toISOString()
                  };
                }
                return r;
              });
            });
            
            return { recipient: record.recipient, success: false, error };
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
      
      // Clear selections after minting
      setSelectedRecords([]);
      
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
    const failedRecordIds = failedRecords
      .map(record => record.id || '')
      .filter(id => id !== '');
    
    setSelectedRecords(failedRecordIds);
    await mintSelected();
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
  
  // Handle deleting individual record
  const handleDeleteRecord = async (record: MintingRecord) => {
    try {
      // If the record has an ID (saved in the database), delete it from Supabase
      if (record.id) {
        await supabase
          .from('nft_mints')
          .delete()
          .eq('id', record.id);
      }
      
      // Update local state to remove the record
      setMintingRecords(prevRecords => 
        prevRecords.filter(r => r !== record)
      );
      
      // Remove from selected records if it was selected
      setSelectedRecords(prev => 
        prev.filter(id => id !== record.id)
      );
      
      toast({
        title: "Record deleted",
        description: `Removed record for ${record.recipient}`
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error deleting record",
        description: error.message || "Failed to delete the record",
        variant: "destructive"
      });
    }
  };
  
  // Handle deleting multiple selected records
  const handleDeleteSelected = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "No records selected",
        description: "Please select at least one record to delete",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Delete records from database if they have IDs
      const recordsWithIds = selectedRecords.filter(id => id && !id.startsWith('temp-'));
      
      if (recordsWithIds.length > 0) {
        await supabase
          .from('nft_mints')
          .delete()
          .in('id', recordsWithIds);
      }
      
      // Update local state to remove the records
      setMintingRecords(prevRecords => 
        prevRecords.filter(record => {
          const recordId = record.id || '';
          return !selectedRecords.includes(recordId);
        })
      );
      
      // Clear selected records
      setSelectedRecords([]);
      
      toast({
        title: "Records deleted",
        description: `Successfully deleted ${selectedRecords.length} records`
      });
    } catch (error) {
      console.error('Error deleting records:', error);
      toast({
        title: "Error deleting records",
        description: error.message || "Failed to delete the selected records",
        variant: "destructive"
      });
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
  
  // Calculate minting stats
  const mintingStats = {
    total: mintingRecords.length,
    minted: mintingRecords.filter(r => r.status === 'minted').length,
    pending: mintingRecords.filter(r => r.status === 'pending').length,
    failed: mintingRecords.filter(r => r.status === 'failed').length
  };
  
  // Check if there are pending records that can be selected
  const hasPendingRecords = mintingStats.pending > 0;
  
  // FIXED: This logic was wrong - now we properly check if ANY selected records are pending
  const hasSelectedPendingRecords = selectedRecords.length > 0 && 
    mintingRecords.some(record => 
      selectedRecords.includes(record.id || '') && record.status === 'pending'
    );
  
  // Check if there are any selected records
  const hasSelectedRecords = selectedRecords.length > 0;

  // Add more logging to help diagnose issues
  console.log("Selected Records:", selectedRecords);
  console.log("Has Pending Records:", hasPendingRecords);
  console.log("Has Selected Pending Records:", hasSelectedPendingRecords);
  console.log("Selected Records Count:", selectedRecords.length);
  console.log("Records With Pending Status:", mintingRecords.filter(r => r.status === 'pending').map(r => r.id));
  console.log("Selected Record Status:", selectedRecords.map(id => {
    const record = mintingRecords.find(r => r.id === id);
    return record ? { id, status: record.status } : { id, status: 'not found' };
  }));
  
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
                  <div className="flex flex-col space-y-2">
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
                    
                    {/* Buttons for selection, deletion and minting */}
                    {mintingRecords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasPendingRecords || isLoading}
                          onClick={handleSelectAllPending}
                          className="flex-1"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Select All Pending
                        </Button>
                        
                        <Button
                          variant="default"
                          size="sm"
                          // FIX: This condition was preventing the button from being clickable
                          // We're now just checking if there are selected records, loading state, and project config
                          disabled={selectedRecords.length === 0 || isLoading || !currentProject.apiKey || !currentProject.templateId}
                          onClick={mintSelected}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Minting...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Mint Selected ({selectedRecords.length})
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasSelectedRecords}
                          onClick={handleDeleteSelected}
                          className="flex-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {mintingRecords.length > 0 ? (
                  <MintingTable 
                    records={mintingRecords}
                    onRetry={handleRetryMint}
                    selectedRecords={selectedRecords}
                    onSelectRecord={handleSelectRecord}
                    onDeleteRecord={handleDeleteRecord}
                  />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>No minting operations yet</p>
                    <p className="text-sm mt-2">Enter recipients and use the mint controls to start</p>
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
