
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { Project } from '@/types/project';

interface ProjectSelectProps {
  projects: Project[];
  selectedProjectId?: string;
  onProjectSelect: (value: string) => void;
  onDeleteProject: () => void;
}

const ProjectSelect: React.FC<ProjectSelectProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect,
  onDeleteProject
}) => {
  if (projects.length === 0) return null;

  return (
    <div className="mb-4">
      <Label>Select Project</Label>
      <div className="flex items-center space-x-2">
        <Select 
          value={selectedProjectId} 
          onValueChange={onProjectSelect}
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
          onClick={onDeleteProject}
          disabled={projects.length <= 1}
          title="Delete Project"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProjectSelect;
