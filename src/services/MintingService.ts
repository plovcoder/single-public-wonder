
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MintingRecord } from "@/components/MintingTable";
import { MintingProject } from "@/types/project";

export class MintingService {
  static async mintNFT(
    record: MintingRecord, 
    project: MintingProject,
    updateRecordStatus: (recordId: string, status: 'minted' | 'failed', errorMessage?: string) => void
  ) {
    try {
      console.log(`[MintingService] Starting minting for recipient: ${record.recipient}`);
      console.log(`[MintingService] Using config:`, {
        templateId: project.templateId,
        collectionId: project.collectionId,
        blockchain: project.blockchain,
        apiKeyProvided: !!project.apiKey,
        supabaseConfig: {
          hasClient: !!supabase,
          url: "Using Supabase client" 
        }
      });
      
      // Verify project configuration
      if (!project.apiKey || !project.collectionId) {
        const error = "Missing API key or collection ID";
        console.error(`[MintingService] Error: ${error}`);
        updateRecordStatus(record.id || '', 'failed', error);
        return { recipient: record.recipient, success: false, error: { message: error } };
      }
      
      // Call our edge function using Supabase client with proper authorization
      console.log(`[MintingService] Invoking edge function 'crossmint-nft' with recipient: ${record.recipient}`);
      console.log(`[MintingService] Request payload:`, {
        recipient: record.recipient,
        templateId: project.templateId,
        collectionId: project.collectionId,
        blockchain: project.blockchain,
        apiKeyProvided: !!project.apiKey,
      });
      
      // Make the request to the edge function
      console.log(`[MintingService] Sending request to edge function now...`);
      const { data, error } = await supabase.functions.invoke(
        'crossmint-nft',
        {
          body: {
            recipient: record.recipient,
            apiKey: project.apiKey,
            templateId: project.templateId,
            collectionId: project.collectionId,
            blockchain: project.blockchain
          }
        }
      );
      
      console.log(`[MintingService] Response for ${record.recipient}:`, data || error);
      
      if (error) {
        console.error(`[MintingService] Supabase invoke error:`, error);
        
        // Try to extract more detailed error message if available
        let detailedError = error.message;
        try {
          // Sometimes error.message might contain a JSON string with more details
          if (typeof error.message === 'string' && error.message.includes('{')) {
            const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
            if (errorJson.error) {
              detailedError = errorJson.error.message || errorJson.error || error.message;
            }
          }
        } catch (e) {
          console.log("[MintingService] Could not parse detailed error:", e);
        }
        
        // Update record in database if it has an ID
        if (record.id && !record.id.startsWith('temp-')) {
          try {
            await supabase
              .from('nft_mints')
              .update({
                status: 'failed',
                error_message: detailedError,
                updated_at: new Date().toISOString()
              })
              .eq('id', record.id);
            console.log(`[MintingService] Updated record in database with failed status and error: ${detailedError}`);
          } catch (dbError) {
            console.error(`[MintingService] Error updating database record:`, dbError);
          }
        }
        
        // Update the local state via callback
        updateRecordStatus(record.id || '', 'failed', detailedError);
        
        return { 
          recipient: record.recipient, 
          success: false,
          error: { message: detailedError }
        };
      }
      
      // FIXED: Improved success detection logic for Crossmint API responses
      // Consider it a success if we have data with an id and no explicit error,
      // or if data.success is true. This handles both response formats.
      const success = !error && (data?.success || (data?.id && !data?.error));
      const errorMessage = error?.message || data?.error?.message || "Unknown error";
      
      // Log detailed information
      if (success) {
        console.log(`[MintingService] Successfully minted NFT for ${record.recipient} on ${project.blockchain}`);
      } else {
        console.error(`[MintingService] Failed to mint NFT for ${record.recipient} on ${project.blockchain}:`, 
          data?.error || errorMessage);
      }
      
      // Update record in database if it has an ID
      if (record.id && !record.id.startsWith('temp-')) {
        console.log(`[MintingService] Updating record in database with status: ${success ? 'minted' : 'failed'}`);
        try {
          await supabase
            .from('nft_mints')
            .update({
              status: success ? 'minted' : 'failed',
              error_message: !success ? errorMessage : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);
          console.log(`[MintingService] Database update completed successfully`);
        } catch (dbError) {
          console.error(`[MintingService] Error updating database record:`, dbError);
        }
      }
      
      // Update the local state via callback
      updateRecordStatus(
        record.id || '', 
        success ? 'minted' : 'failed', 
        !success ? errorMessage : undefined
      );
      
      return { 
        recipient: record.recipient, 
        success,
        error: !success ? error || data?.error : null
      };
    } catch (error: any) {
      console.error(`[MintingService] Unhandled error minting for ${record.recipient}:`, error);
      
      // Update record in database if it has an ID
      if (record.id && !record.id.startsWith('temp-')) {
        try {
          await supabase
            .from('nft_mints')
            .update({
              status: 'failed',
              error_message: error.message || 'Network error',
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);
          console.log(`[MintingService] Updated record in database after unhandled error`);
        } catch (dbError) {
          console.error(`[MintingService] Error updating database record:`, dbError);
        }
      }
      
      // Update the local state via callback
      updateRecordStatus(record.id || '', 'failed', error.message || 'Network error');
      
      return { recipient: record.recipient, success: false, error };
    }
  }

  static async processMultipleMints(
    records: MintingRecord[],
    project: MintingProject,
    updateRecordStatus: (recordId: string, status: 'minted' | 'failed', errorMessage?: string) => void
  ) {
    const concurrencyLimit = 5; // Process 5 at a time
    const mintPromises = [];
    const pendingRecords = records.filter(record => record.status === 'pending');
    
    if (pendingRecords.length === 0) {
      toast({
        title: "No pending records selected",
        description: "Please select at least one pending record to mint",
        variant: "destructive"
      });
      return { successCount: 0, failureCount: 0 };
    }
    
    toast({
      title: "Minting started",
      description: `Starting to mint ${pendingRecords.length} NFTs`
    });
    
    // Process minting in parallel with a concurrency limit
    for (let i = 0; i < pendingRecords.length; i += concurrencyLimit) {
      const batch = pendingRecords.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(record => 
        this.mintNFT(record, project, updateRecordStatus)
      );
      
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
    
    return { successCount, failureCount };
  }

  static async deleteRecord(record: MintingRecord) {
    try {
      // If the record has an ID (saved in the database), delete it from Supabase
      if (record.id) {
        await supabase
          .from('nft_mints')
          .delete()
          .eq('id', record.id);
      }
      
      toast({
        title: "Record deleted",
        description: `Removed record for ${record.recipient}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error deleting record",
        description: error.message || "Failed to delete the record",
        variant: "destructive"
      });
      return false;
    }
  }

  static async deleteMultipleRecords(recordIds: string[]) {
    try {
      // Delete records from database if they have IDs
      const recordsWithIds = recordIds.filter(id => id && !id.startsWith('temp-'));
      
      if (recordsWithIds.length > 0) {
        await supabase
          .from('nft_mints')
          .delete()
          .in('id', recordsWithIds);
      }
      
      toast({
        title: "Records deleted",
        description: `Successfully deleted ${recordIds.length} records`
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deleting records:', error);
      toast({
        title: "Error deleting records",
        description: error.message || "Failed to delete the selected records",
        variant: "destructive"
      });
      return false;
    }
  }

  static async retryMint(
    record: MintingRecord, 
    project: MintingProject,
    updateRecordStatus: (recordId: string, status: 'pending' | 'minted' | 'failed', errorMessage?: string) => void
  ) {
    if (record.status !== 'failed') return false;
    
    toast({
      title: "Retrying mint",
      description: `Retrying mint for ${record.recipient}`
    });
    
    try {
      console.log(`[MintingService] Retrying mint for ${record.recipient} on ${project.blockchain}`);
      
      // Actualizar estado a pending
      await supabase
        .from('nft_mints')
        .update({ 
          status: 'pending', 
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);
      
      // Actualizar en UI via callback
      updateRecordStatus(record.id || '', 'pending');
      
      // Now mint the NFT
      return await this.mintNFT(
        { ...record, status: 'pending' },
        project,
        updateRecordStatus
      );
    } catch (error: any) {
      console.error(`Error retrying mint for ${record.recipient}:`, error);
      
      // Update via callback
      updateRecordStatus(record.id || '', 'failed', error.message || "Network error");
      
      toast({
        title: "Error retrying mint",
        description: error.message || "There was an error processing your request",
        variant: "destructive"
      });
      
      return false;
    }
  }

  static async loadMintingRecordsForProject(projectId: string) {
    try {
      const { data: mintData, error: mintError } = await supabase
        .from('nft_mints')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (mintError) {
        console.error('Error fetching minting records:', mintError);
        return [];
      }
      
      if (mintData) {
        // Safely map the data to ensure status is of correct type
        return mintData.map((item) => ({
          ...item,
          status: item.status as 'pending' | 'minted' | 'failed',
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error loading minting records:', error);
      return [];
    }
  }
}
