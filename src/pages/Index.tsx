
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import MintingTable, { MintingRecord } from "@/components/MintingTable";
import ConfigForm from "@/components/ConfigForm";
import { supabase } from "@/integrations/supabase/client";
import RecipientInput from "@/components/RecipientInput";
import MintingStats from "@/components/MintingStats";
import { MintingService } from "@/services/MintingService";

const Index: React.FC = () => {
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
        const mintRecords = await MintingService.loadMintingRecordsForProject(project.id);
        setMintingRecords(mintRecords);
      }
    };
    
    loadInitialRecords();
  }, []);
  
  const handleProjectChange = async (projectId?: string) => {
    if (!projectId) return;
    
    try {
      // Fetch project details and update current project
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
        const mintRecords = await MintingService.loadMintingRecordsForProject(data.id);
        setMintingRecords(mintRecords);
        setSelectedRecords([]); // Clear selections
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
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
  
  const handleRecipientsLoaded = (newRecords: MintingRecord[]) => {
    setMintingRecords(prev => [...newRecords, ...prev]);
    setSelectedRecords([]); // Clear selections
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
  
  // Update a record's status
  const updateRecordStatus = (recordId: string, status: 'pending' | 'minted' | 'failed', errorMessage?: string) => {
    setMintingRecords(prevRecords => {
      return prevRecords.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            status,
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          };
        }
        return r;
      });
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
      
      await MintingService.processMultipleMints(
        selectedMintingRecords,
        currentProject,
        updateRecordStatus
      );
      
      // Clear selections after minting
      setSelectedRecords([]);
    } catch (error: any) {
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

  // Function to retry all failed mints
  const retryFailedMints = async () => {
    const failedRecords = mintingRecords.filter(record => record.status === 'failed');
    
    if (failedRecords.length === 0) {
      toast({
        title: "No failed mints",
        description: "There are no failed mints to retry",
      });
      return;
    }
    
    toast({
      title: "Retrying failed mints",
      description: `Preparing to retry ${failedRecords.length} failed mints`
    });
    
    // Update records to pending for retry
    for (const record of failedRecords) {
      await supabase
        .from('nft_mints')
        .update({ 
          status: 'pending', 
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);
      
      // Update UI
      updateRecordStatus(record.id || '', 'pending');
    }
    
    // Set selected records to the failed ones and mint them
    const failedRecordIds = failedRecords
      .map(record => record.id || '')
      .filter(id => id !== '');
    
    setSelectedRecords(failedRecordIds);
    await mintSelected();
  };
  
  // Individual retry function
  const handleRetryMint = async (record: MintingRecord) => {
    setIsLoading(true);
    try {
      await MintingService.retryMint(record, currentProject, updateRecordStatus);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deleting individual record
  const handleDeleteRecord = async (record: MintingRecord) => {
    const success = await MintingService.deleteRecord(record);
    if (success) {
      // Update local state to remove the record
      setMintingRecords(prevRecords => 
        prevRecords.filter(r => r !== record)
      );
      
      // Remove from selected records if it was selected
      setSelectedRecords(prev => 
        prev.filter(id => id !== record.id)
      );
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
    
    const success = await MintingService.deleteMultipleRecords(selectedRecords);
    
    if (success) {
      // Update local state to remove the records
      setMintingRecords(prevRecords => 
        prevRecords.filter(record => {
          const recordId = record.id || '';
          return !selectedRecords.includes(recordId);
        })
      );
      
      // Clear selected records
      setSelectedRecords([]);
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
                <RecipientInput 
                  currentProject={currentProject}
                  onRecipientsLoaded={handleRecipientsLoaded}
                  failedMintCount={mintingStats.failed}
                  isLoading={isLoading}
                  onRetryFailedMints={retryFailedMints}
                />
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
                  <MintingStats 
                    stats={mintingStats}
                    selectedRecords={selectedRecords}
                    hasPendingRecords={hasPendingRecords}
                    isLoading={isLoading}
                    currentProject={currentProject}
                    onSelectAllPending={handleSelectAllPending}
                    onMintSelected={mintSelected}
                    onDeleteSelected={handleDeleteSelected}
                  />
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
                    onSelectAllPending={handleSelectAllPending}
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
