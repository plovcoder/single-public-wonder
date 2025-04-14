
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('[Validate Template] Request received:', new Date().toISOString());
    
    const url = new URL(req.url);
    const templateId = url.searchParams.get('templateId');
    const apiKey = url.searchParams.get('apiKey');
    
    if (!templateId || !apiKey) {
      console.error('[Validate Template] Missing parameters:', { 
        templateIdProvided: !!templateId,
        apiKeyProvided: !!apiKey
      });
      
      return new Response(
        JSON.stringify({ error: 'Missing templateId or apiKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Validate Template] Validating template: ${templateId}`);
    
    // Call Crossmint API to validate template
    let response;
    try {
      const endpoint = `https://staging.crossmint.com/api/2022-06-09/collections/${templateId}`;
      console.log(`[Validate Template] Calling Crossmint API: ${endpoint}`);
      
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'accept': 'application/json'
        }
      });
      
      console.log(`[Validate Template] Crossmint API response status: ${response.status}`);
    } catch (e) {
      console.error('[Validate Template] Network error calling Crossmint API:', e);
      
      return new Response(
        JSON.stringify({ error: 'Failed to connect to Crossmint API', details: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let data;
    try {
      data = await response.json();
      console.log('[Validate Template] Response data:', data);
    } catch (e) {
      console.error('[Validate Template] Failed to parse response:', e);
      
      return new Response(
        JSON.stringify({ error: 'Failed to parse Crossmint API response', details: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (response.ok) {
      console.log(`[Validate Template] Template validation successful for ${templateId}`);
      console.log(`[Validate Template] Template blockchain: ${data.chain || 'not specified'}`);
      console.log(`[Validate Template] Template name: ${data.name || 'not specified'}`);
    } else {
      console.error(`[Validate Template] Template validation failed for ${templateId}:`, data);
    }
    
    // Return the response with CORS headers
    return new Response(
      JSON.stringify(data),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error validating template:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to validate template', stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
