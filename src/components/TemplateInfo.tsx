
import React from 'react';

interface TemplateInfoProps {
  name: string;
  image?: string;
}

const TemplateInfo: React.FC<TemplateInfoProps> = ({ name, image }) => {
  return (
    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
      <p className="text-sm font-medium text-green-800">Configuration validated successfully</p>
      <p className="text-sm text-green-700">Template Name: {name}</p>
      {image && (
        <div className="mt-2">
          <p className="text-sm text-green-700 mb-1">NFT Preview:</p>
          <img 
            src={image} 
            alt="NFT Preview" 
            className="h-20 w-20 object-cover rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TemplateInfo;
