
import React from 'react';
import { Check, Loader2, X } from 'lucide-react';

interface ValidationIndicatorProps {
  status: 'idle' | 'validating' | 'valid' | 'invalid';
}

const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({ status }) => {
  if (status === 'idle') return null;
  
  return (
    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
      {status === 'validating' && (
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
      )}
      {status === 'valid' && (
        <Check className="h-4 w-4 text-green-500" />
      )}
      {status === 'invalid' && (
        <X className="h-4 w-4 text-red-500" />
      )}
    </div>
  );
};

export default ValidationIndicator;
