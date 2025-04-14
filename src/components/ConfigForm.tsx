import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Check, X, Loader2, Info } from 'lucide-react';
import { debounce } from 'lodash';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Project } from '@/types/project';

interface ConfigFormProps {
  onConfigSaved: (project: Project) => void;
  onProjectChange: (projectId?: string) => void;
}

interface TemplateInfo {
  name?: string;
  blockchain?: string;
  image?: string;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onConfigSaved, onProjectChange }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project>({
    name: '',
    api_key: '',
    template_id: '',
    collection_id: '',
    blockchain: 'chiliz'
  });
  
  // New states for template validation
  const [templateValidationStatus, setTemplateValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('nft_projects')
        .select('*')
        .order('created_at');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Handle the case when data might not have collection_id (for backward compatibility)
        const projectsWithCollectionId = data.map(project => ({
          ...project,
          collection_id: project.collection_id || project.template_id // Fallback to template_id if collection_id is not present
        }));
        
        setProjects(projectsWithCollectionId);
        // Select the first project by default
        const firstProjectId = data[0].id;
        setSelectedProjectId(firstProjectId);
        onProjectChange(firstProjectId);
        
        // Set current project with the collection_id field
        setCurrentProject({
          ...data[0],
          collection_id: data[0].collection_id || data[0].template_id // Fallback to template_id if collection_id is not present
        });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error fetching projects",
        description: "Could not load existing projects",
        variant: "destructive"
      });
    }
  };
  
  const handleProjectSelect = (value: string) => {
    // Si se selecciona "new", activar modo de creación de proyecto
    if (value === "new") {
      setIsAddingProject(true);
      setCurrentProject({
        name: '',
        api_key: '',
        template_id: '',
        collection_id: '',
        blockchain: 'chiliz'
      });
      // Reset validation states
      setTemplateValidationStatus('idle');
      setTemplateInfo({});
      setValidationError(null);
      return;
    }
    
    const selectedProject = projects.find(p => p.id === value);
    if (selectedProject) {
      setSelectedProjectId(value);
      // Ensure collection_id is set, falling back to template_id if necessary
      setCurrentProject({
        ...selectedProject,
        collection_id: selectedProject.collection_id || selectedProject.template_id
      });
      onProjectChange(value);
      setIsAddingProject(false);
      
      // Reset validation states
      setTemplateValidationStatus('idle');
      setTemplateInfo({});
      setValidationError(null);
    }
  };
  
  const handleTemplateAndCollectionValidation = debounce(async (templateId: string, collectionId: string, apiKey: string) => {
    if (!apiKey) {
      setTemplateValidationStatus('idle');
      setTemplateInfo({});
      setValidationError(null);
      return;
    }

    setTemplateValidationStatus('validating');

    try {
      const response = await fetch(
        `https://ikuviazxpqpbomfaucom.supabase.co/functions/v1/validate-template?templateId=${templateId}&collectionId=${collectionId}&apiKey=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTemplateValidationStatus('valid');
        setTemplateInfo({
          name: data.name,
          blockchain: data.chain?.toLowerCase() || '',
          image: data.metadata?.image
        });

        // Update blockchain only if we got a valid value
        const standardizedBlockchain = standardizeBlockchain(data.chain);
        if (standardizedBlockchain) {
          setCurrentProject(prev => ({
            ...prev,
            blockchain: standardizedBlockchain
          }));
        }

        setValidationError(null);
      } else {
        setTemplateValidationStatus('invalid');
        setTemplateInfo({});
        setValidationError(data.message || 'Error validating configuration');
      }
    } catch (error) {
      console.error('Error validating template:', error);
      setTemplateValidationStatus('invalid');
      setTemplateInfo({});
      setValidationError('Error al validar la configuración. Intenta nuevamente.');
    }
  }, 500);

  const standardizeBlockchain = (chain?: string): string => {
    if (!chain) return 'chiliz';
    
    const chainMap: Record<string, string> = {
      'polygon': 'polygon-amoy',
      'ethereum': 'ethereum-sepolia',
      'solana': 'solana',
      'chiliz': 'chiliz'
    };

    for (const [key, value] of Object.entries(chainMap)) {
      if (chain.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'chiliz';
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    
    setCurrentProject(prev => ({
      ...prev,
      api_key: newApiKey
    }));
    
    // If we have both collection ID and template ID, validate
    if (currentProject.template_id && currentProject.collection_id) {
      handleTemplateAndCollectionValidation(
        currentProject.template_id,
        currentProject.collection_id,
        newApiKey
      );
    }
  };

  const handleTemplateIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTemplateId = e.target.value;
    
    setCurrentProject(prev => ({
      ...prev,
      template_id: newTemplateId
    }));

    // If we have API key and collection ID, validate
    if (currentProject.api_key && currentProject.collection_id) {
      handleTemplateAndCollectionValidation(
        newTemplateId,
        currentProject.collection_id,
        currentProject.api_key
      );
    }
  };

  const handleCollectionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCollectionId = e.target.value;
    
    setCurrentProject(prev => ({
      ...prev,
      collection_id: newCollectionId
    }));

    // If we have API key and template ID, validate
    if (currentProject.api_key && currentProject.template_id) {
      handleTemplateAndCollectionValidation(
        currentProject.template_id,
        newCollectionId,
        currentProject.api_key
      );
    }
  };
  
  const handleTemplateIdBlur = () => {
    // Validate on blur if we have both template ID and API key
    if (currentProject.template_id && currentProject.api_key) {
      handleTemplateAndCollectionValidation(
        currentProject.template_id,
        currentProject.collection_id,
        currentProject.api_key
      );
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProject.name || !currentProject.api_key || !currentProject.template_id) {
      toast({
        title: "Missing information",
        description: "Please fill in all project details",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure collection_id is set, defaulting to template_id if not provided
    const collection_id = currentProject.collection_id || currentProject.template_id;
    
    // Do not allow submission if template validation failed
    if (templateValidationStatus === 'invalid') {
      toast({
        title: "Invalid Template ID",
        description: validationError || "The Template ID is not valid",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let result;
      if (currentProject.id) {
        // Update existing project
        result = await supabase
          .from('nft_projects')
          .update({
            name: currentProject.name,
            api_key: currentProject.api_key,
            template_id: currentProject.template_id,
            collection_id: collection_id,
            blockchain: currentProject.blockchain
          })
          .eq('id', currentProject.id)
          .select();
      } else {
        // Create new project
        result = await supabase
          .from('nft_projects')
          .insert({
            name: currentProject.name,
            api_key: currentProject.api_key,
            template_id: currentProject.template_id,
            collection_id: collection_id,
            blockchain: currentProject.blockchain
          })
          .select();
      }
      
      const { data, error } = result;
      
      if (error) throw error;
      
      if (data) {
        const savedProject = data[0];
        
        // Ensure the saved project has collection_id set
        const projectWithCollection = {
          ...savedProject,
          collection_id: savedProject.collection_id || savedProject.template_id
        };
        
        onConfigSaved(projectWithCollection);
        
        // Refresh projects list
        fetchProjects();
        
        // Reset form
        setCurrentProject({
          name: '',
          api_key: '',
          template_id: '',
          collection_id: '',
          blockchain: 'chiliz'
        });
        setIsAddingProject(false);
        
        // Reset validation states
        setTemplateValidationStatus('idle');
        setTemplateInfo({});
        setValidationError(null);
        
        toast({
          title: "Project saved",
          description: `${savedProject.name} has been saved successfully`
        });
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error saving project",
        description: "Could not save project details",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      const { error } = await supabase
        .from('nft_projects')
        .delete()
        .eq('id', selectedProjectId);
      
      if (error) throw error;
      
      // Refresh projects list
      await fetchProjects();
      
      toast({
        title: "Project deleted",
        description: "The project has been removed"
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error deleting project",
        description: "Could not delete the project",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>NFT Projects</CardTitle>
        <CardDescription>
          Manage your NFT minting projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700">Configuración de Crossmint</AlertTitle>
          <AlertDescription className="text-blue-600 text-sm">
            <p className="mt-1">
              <strong>Collection ID:</strong> Se usa en la URL del endpoint (ej: /collections/ID/nfts)
            </p>
            <p>
              <strong>Template ID:</strong> Se envía en el body y define la metadata del NFT
            </p>
          </AlertDescription>
        </Alert>
        
        {projects.length > 0 && (
          <div className="mb-4">
            <Label>Select Project</Label>
            <div className="flex items-center space-x-2">
              <Select 
                value={selectedProjectId} 
                onValueChange={handleProjectSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id || ''}>
                      {project.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" className="text-green-600 font-medium">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Project
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={handleDeleteProject}
                disabled={projects.length <= 1}
                title="Delete Project"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="Enter project name (e.g. Boca Juniors)"
              value={currentProject.name}
              onChange={(e) => setCurrentProject(prev => ({
                ...prev, 
                name: e.target.value
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key">Crossmint API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Crossmint API Key"
              value={currentProject.api_key}
              onChange={handleApiKeyChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-id">Collection ID</Label>
            <Input
              id="collection-id"
              placeholder="Enter your Collection ID (e.g. af08ba4d-927d-4d94-b3d7-cdba49e80fd8)"
              value={currentProject.collection_id}
              onChange={handleCollectionIdChange}
              className={`${
                templateValidationStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' : 
                templateValidationStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : ''
              }`}
            />
            <p className="text-xs text-muted-foreground">
              Used in API endpoint URL: /collections/{currentProject.collection_id}/nfts
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-id">Template ID</Label>
            <div className="relative">
              <Input
                id="template-id"
                placeholder="Enter your Template ID (e.g. 47bdeb30-f082-4c74-a02b-02bee1f8a49f)"
                value={currentProject.template_id}
                onChange={handleTemplateIdChange}
                className={`pr-10 ${
                  templateValidationStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' : 
                  templateValidationStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : ''
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {templateValidationStatus === 'validating' && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
                {templateValidationStatus === 'valid' && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {templateValidationStatus === 'invalid' && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sent in request body as "templateId" to define NFT metadata
            </p>

            {templateValidationStatus === 'invalid' && validationError && (
              <p className="text-sm text-red-500 mt-1">{validationError}</p>
            )}

            {templateValidationStatus === 'valid' && templateInfo.name && (
              <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
                <p className="text-sm font-medium text-green-800">Configuration validated successfully</p>
                <p className="text-sm text-green-700">Template Name: {templateInfo.name}</p>
                {templateInfo.image && (
                  <div className="mt-2">
                    <p className="text-sm text-green-700 mb-1">NFT Preview:</p>
                    <img 
                      src={templateInfo.image} 
                      alt="NFT Preview" 
                      className="h-20 w-20 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blockchain">Blockchain</Label>
            <Select 
              value={currentProject.blockchain} 
              onValueChange={(value) => setCurrentProject(prev => ({
                ...prev, 
                blockchain: value
              }))}
              disabled={templateValidationStatus === 'valid' && !!templateInfo.blockchain}
            >
              <SelectTrigger id="blockchain">
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solana">Solana</SelectItem>
                <SelectItem value="polygon-amoy">Polygon-Amoy</SelectItem>
                <SelectItem value="ethereum-sepolia">Ethereum-Sepolia</SelectItem>
                <SelectItem value="chiliz">Chiliz</SelectItem>
              </SelectContent>
            </Select>
            {templateValidationStatus === 'valid' && templateInfo.blockchain && (
              <p className="text-xs text-green-600 mt-1">
                Blockchain detectado automáticamente del template
              </p>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={templateValidationStatus === 'invalid'}>
            {currentProject.id ? 'Update Project' : 'Create Project'}
          </Button>
        </form>
        
        {projects.length > 0 && !isAddingProject && (
          <div className="mt-4 text-sm text-muted-foreground">
            Current Project: {currentProject.name}
          </div>
        )}
        
        {isAddingProject && (
          <div className="mt-4 text-sm text-blue-600 font-medium">
            Creating new project...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
