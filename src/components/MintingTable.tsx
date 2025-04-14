
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface MintingRecord {
  id?: string;
  recipient: string;
  status: 'pending' | 'minted' | 'failed';
  error_message?: string;
}

interface MintingTableProps {
  records: MintingRecord[];
}

const MintingTable: React.FC<MintingTableProps> = ({ records }) => {
  if (records.length === 0) {
    return null;
  }

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

  return (
    <div className="w-full overflow-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Status</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead className="hidden md:table-cell">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={record.id || index}>
              <TableCell className="font-medium">
                {getStatusIcon(record.status)}
              </TableCell>
              <TableCell title={record.recipient}>
                {formatRecipient(record.recipient)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {record.status === 'failed' && record.error_message ? (
                  <span className="text-red-500">{record.error_message}</span>
                ) : (
                  <span className="text-gray-500">
                    {record.status === 'minted' ? 'Successfully minted' : 
                     record.status === 'pending' ? 'Waiting to be processed' : ''}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MintingTable;
