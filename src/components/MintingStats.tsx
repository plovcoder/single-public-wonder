
import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckSquare, Check, Trash2, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MintingStatsProps {
  stats: {
    total: number;
    minted: number;
    pending: number;
    failed: number;
  };
  selectedRecords: string[];
  hasPendingRecords: boolean;
  isLoading: boolean;
  currentProject: {
    apiKey: string;
    templateId: string;
  };
  onSelectAllPending: () => void;
  onMintSelected: () => void;
  onDeleteSelected: () => void;
}

const MintingStats: React.FC<MintingStatsProps> = ({
  stats,
  selectedRecords,
  hasPendingRecords,
  isLoading,
  currentProject,
  onSelectAllPending,
  onMintSelected,
  onDeleteSelected
}) => {
  const hasSelectedRecords = selectedRecords.length > 0;
  const hasSelectedPendingRecords = hasSelectedRecords && hasPendingRecords;
  const canMint = hasSelectedRecords && currentProject.apiKey && currentProject.templateId;
  
  // Define why minting might be disabled
  const getMintButtonTitle = () => {
    if (!currentProject.apiKey || !currentProject.templateId) {
      return "Configure API Key and Template ID first";
    }
    if (!hasSelectedRecords) {
      return "Select records to mint"; 
    }
    return "Mint selected NFTs";
  };

  const renderConfigStatus = () => {
    if (!currentProject.apiKey || !currentProject.templateId) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-sm text-yellow-800 mb-2">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1" />
            <span className="font-medium">Action Required:</span>
          </div>
          <ul className="list-disc ml-5 mt-1">
            {!currentProject.apiKey && <li>Missing API Key</li>}
            {!currentProject.templateId && <li>Missing Template ID</li>}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col space-y-2">
      {renderConfigStatus()}
      
      <div className="flex items-center justify-between text-sm mt-2">
        <div className="flex space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
            <span>Minted: {stats.minted}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full mr-1"></span>
            <span>Pending: {stats.pending}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1"></span>
            <span>Failed: {stats.failed}</span>
          </div>
        </div>
        <div>Total: {stats.total}</div>
      </div>
      
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPendingRecords || isLoading}
            onClick={onSelectAllPending}
            className="flex-1"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Select All Pending
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={!canMint || isLoading}
                    onClick={onMintSelected}
                    className="w-full"
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
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {!canMint ? (
                  <div className="space-y-1">
                    {!currentProject.apiKey && (
                      <div className="flex items-center text-yellow-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Missing API Key</span>
                      </div>
                    )}
                    {!currentProject.templateId && (
                      <div className="flex items-center text-yellow-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Missing Template ID</span>
                      </div>
                    )}
                    {!hasSelectedRecords && (
                      <div className="flex items-center text-yellow-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>No records selected</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Mint {selectedRecords.length} selected NFTs</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSelectedRecords || isLoading}
            onClick={onDeleteSelected}
            className="flex-1 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}
    </div>
  );
};

export default MintingStats;
