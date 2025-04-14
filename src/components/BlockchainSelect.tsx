
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BlockchainSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  detectedBlockchain?: string;
}

const BlockchainSelect: React.FC<BlockchainSelectProps> = ({
  value,
  onChange,
  disabled,
  detectedBlockchain
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="blockchain">Blockchain</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="blockchain" className={detectedBlockchain ? 'border-green-500' : ''}>
          <SelectValue placeholder="Select blockchain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solana">Solana</SelectItem>
          <SelectItem value="polygon-amoy">Polygon-Amoy</SelectItem>
          <SelectItem value="ethereum-sepolia">Ethereum-Sepolia</SelectItem>
          <SelectItem value="chiliz">Chiliz</SelectItem>
        </SelectContent>
      </Select>
      {detectedBlockchain && (
        <p className="text-sm text-green-600 mt-1">
          Blockchain automatically detected from template
        </p>
      )}
    </div>
  );
};

export default BlockchainSelect;
