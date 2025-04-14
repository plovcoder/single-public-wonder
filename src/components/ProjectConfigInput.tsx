
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ValidationIndicator from './ValidationIndicator';

interface ProjectConfigInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  description?: string;
  validationStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  error?: string;
}

const ProjectConfigInput: React.FC<ProjectConfigInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  validationStatus,
  error
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`pr-10 ${
            validationStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' : 
            validationStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : ''
          }`}
        />
        <ValidationIndicator status={validationStatus} />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && validationStatus === 'invalid' && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default ProjectConfigInput;
