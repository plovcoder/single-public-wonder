
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Edit } from 'lucide-react';

interface Project {
  id?: string;
  name: string;
  api_key: string;
  template_id: string;
  blockchain: string;
}

interface ConfigFormProps {
  onConfigSaved: (project: Project) => void;
  onProjectChange: (projectId?: string) => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onConfigSaved, onProjectChange }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project>({
    name: '',
    api_key: '',
    template_id: '',
    blockchain: 'chiliz'
  });
  
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
        setProjects(data);
        // Select the first project by default
        const firstProjectId = data[0].id;
        setSelectedProjectId(firstProjectId);
        onProjectChange(firstProjectId);
        setCurrentProject(data[0]);
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
        blockchain: 'chiliz'
      });
      return;
    }
    
    const selectedProject = projects.find(p => p.id === value);
    if (selectedProject) {
      setSelectedProjectId(value);
      setCurrentProject(selectedProject);
      onProjectChange(value);
      setIsAddingProject(false);
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
            blockchain: currentProject.blockchain
          })
          .select();
      }
      
      const { data, error } = result;
      
      if (error) throw error;
      
      if (data) {
        const savedProject = data[0];
        onConfigSaved(savedProject);
        
        // Refresh projects list
        fetchProjects();
        
        // Reset form
        setCurrentProject({
          name: '',
          api_key: '',
          template_id: '',
          blockchain: 'chiliz'
        });
        setIsAddingProject(false);
        
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
              onChange={(e) => setCurrentProject(prev => ({
                ...prev, 
                api_key: e.target.value
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-id">Template ID</Label>
            <Input
              id="template-id"
              placeholder="Enter your Template ID"
              value={currentProject.template_id}
              onChange={(e) => setCurrentProject(prev => ({
                ...prev, 
                template_id: e.target.value
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blockchain">Blockchain</Label>
            <Select 
              value={currentProject.blockchain} 
              onValueChange={(value) => setCurrentProject(prev => ({
                ...prev, 
                blockchain: value
              }))}
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
          </div>
          
          <Button type="submit" className="w-full">
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
