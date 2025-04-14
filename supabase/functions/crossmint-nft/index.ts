
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    const { recipient, apiKey, templateId } = requestBody;
    
    console.log("[Edge Function] Request received:", {
      recipient,
      templateId,
      apiKeyProvided: !!apiKey
    });
    
    if (!recipient || !apiKey || !templateId) {
      console.error("[Edge Function] Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Crossmint staging API
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    
    // The minimum required payload
    const mintPayload = {
      recipient,
      templateId
    };
    
    console.log(`[Edge Function] Sending request to Crossmint:`, mintPayload);
    
    // Send payload to Crossmint API
    const response = await fetch(
      crossmintEndpoint,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(mintPayload),
      }
    );
    
    // Get the response as text first for better logging
    const responseText = await response.text();
    console.log(`[Edge Function] Crossmint response (${response.status}):`, responseText);
    
    // Parse the response if it's JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    // Return the response from Crossmint
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
