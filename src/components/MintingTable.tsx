
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertCircle, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

export interface MintingRecord {
  id?: string;
  recipient: string;
  status: 'pending' | 'minted' | 'failed';
  error_message?: string;
  project_id?: string;
  created_at?: string;
  updated_at?: string;
  template_id?: string;
}

interface MintingTableProps {
  records: MintingRecord[];
  selectedRecords: string[];
  onRetry?: (record: MintingRecord) => void;
  onSelectRecord: (recordId: string, checked: boolean) => void;
  onDeleteRecord?: (record: MintingRecord) => void;
  onSelectAllPending?: () => void;
}

const MintingTable: React.FC<MintingTableProps> = ({ 
  records, 
  onRetry, 
  selectedRecords,
  onSelectRecord,
  onDeleteRecord,
  onSelectAllPending
}) => {
  if (records.length === 0) {
    return null;
  }

  // Count pending records to enable/disable the select all button
  const pendingRecordsCount = records.filter(record => record.status === 'pending').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center justify-center w-5 h-5 bg-yellow-400 rounded-full" title="Pending">🟡</span>;
      case 'minted':
        return <span className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full" title="Minted">🟢</span>;
      case 'failed':
        return <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full" title="Failed">🔴</span>;
      default:
        return <span className="flex items-center justify-center w-5 h-5 bg-gray-300 rounded-full" title="Unknown">❓</span>;
    }
  };

  const formatRecipient = (recipient: string) => {
    // If it's an email (contains @), display first 4 chars, then ..., then domain
    if (recipient.includes('@')) {
      const [localPart, domain] = recipient.split('@');
      if (localPart.length > 4) {
        return `${localPart.substring(0, 4)}...@${domain}`;
      }
      return recipient;
    }
    
    // If it's a wallet address, display first 6 and last 4 chars
    if (recipient.length > 12) {
      return `${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`;
    }
    
    return recipient;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full overflow-auto border rounded-md">
      {pendingRecordsCount > 0 && onSelectAllPending && (
        <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
          <span className="text-sm text-gray-500">{pendingRecordsCount} pending record(s)</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSelectAllPending}
          >
            Select All Pending
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Select</TableHead>
            <TableHead className="w-12">Status</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead className="hidden md:table-cell">Details</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const recordId = record.id || `temp-${index}`;
            const isSelected = selectedRecords.includes(recordId);
            
            return (
              <TableRow key={recordId} className={record.status === 'failed' ? 'bg-red-50' : ''}>
                <TableCell>
                  <Checkbox 
                    id={`select-${recordId}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      onSelectRecord(recordId, checked === true);
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {getStatusIcon(record.status)}
                </TableCell>
                <TableCell title={record.recipient}>
                  {formatRecipient(record.recipient)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {record.status === 'failed' && record.error_message ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-red-500 cursor-help">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span className="truncate max-w-[200px]">
                              {record.error_message.substring(0, 30)}
                              {record.error_message.length > 30 ? '...' : ''}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>{record.error_message}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-gray-500">
                      {record.status === 'minted' ? 'Successfully minted' : 
                      record.status === 'pending' ? 'Waiting to be processed' : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(record.updated_at || record.created_at)}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {record.status === 'failed' && onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetry(record)}
                      title="Retry minting"
                    >
                      <RefreshCcw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  )}
                  {onDeleteRecord && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteRecord(record)}
                      title="Delete record"
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default MintingTable;
