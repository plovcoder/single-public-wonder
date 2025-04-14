
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConfigFormProps {
  onConfigSaved: (apiKey: string, templateId: string, blockchain: string) => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onConfigSaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [blockchain, setBlockchain] = useState('chiliz');
  const [loading, setLoading] = useState(false);
  
  // Try to load existing config from database
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('nft_config')
          .select('*')
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setApiKey(data[0].api_key || '');
          setTemplateId(data[0].template_id || '');
          setBlockchain(data[0].blockchain || 'chiliz');
          // Automatically pass the config up
          onConfigSaved(data[0].api_key, data[0].template_id, data[0].blockchain || 'chiliz');
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    
    fetchConfig();
  }, [onConfigSaved]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !templateId) {
      toast({
        title: "Missing information",
        description: "Please enter both API Key and Template ID",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Try to update existing record first
      const { data, error } = await supabase
        .from('nft_config')
        .upsert({
          api_key: apiKey,
          template_id: templateId,
          blockchain: blockchain,
          updated_at: new Date().toISOString()
        }, { onConflict: 'template_id' });
      
      if (error) throw error;
      
      toast({
        title: "Configuration saved",
        description: "Your API key, template ID, and blockchain have been saved"
      });
      
      onConfigSaved(apiKey, templateId, blockchain);
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error saving configuration",
        description: "There was an error saving your configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crossmint Configuration</CardTitle>
        <CardDescription>
          Enter your Crossmint API Key, Template ID, and select a blockchain
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Crossmint API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-id">Template ID</Label>
            <Input
              id="template-id"
              placeholder="Enter your Template ID"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blockchain">Blockchain</Label>
            <Select 
              value={blockchain} 
              onValueChange={setBlockchain}
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
