
export interface Project {
  id?: string;
  name: string;
  api_key: string;
  template_id: string;
  collection_id: string;
  blockchain: string;
  created_at?: string;
  updated_at?: string;
}

export interface MintingProject {
  id?: string;
  apiKey: string;
  templateId: string;
  collectionId: string;
  blockchain: string;
}
