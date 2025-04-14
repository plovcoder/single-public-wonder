
-- Add collection_id column to nft_projects table if it doesn't exist
ALTER TABLE nft_projects 
ADD COLUMN IF NOT EXISTS collection_id TEXT;

-- For existing records, initialize collection_id with template_id for backward compatibility
UPDATE nft_projects 
SET collection_id = template_id 
WHERE collection_id IS NULL;
