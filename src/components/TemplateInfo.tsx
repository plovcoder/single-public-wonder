
import React from 'react';

interface TemplateInfoProps {
  name: string;
  image?: string;
}

const TemplateInfo: React.FC<TemplateInfoProps> = ({ name, image }) => {
  return (
    <div className="mt-2 p-4 bg-green-50 border border-green-100 rounded-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">Configuration validated successfully</p>
          <p className="text-sm text-green-700">Template Name: {name}</p>
        </div>
        {image && (
          <div className="ml-4">
            <p className="text-sm text-green-700 mb-1">NFT Preview:</p>
            <img 
              src={image} 
              alt="NFT Preview" 
              className="h-24 w-24 object-cover rounded-md border border-green-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateInfo;
