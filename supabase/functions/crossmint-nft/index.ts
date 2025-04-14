
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
    console.log("[Edge Function] Received minting request at:", new Date().toISOString());
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("[Edge Function] Parsed request body successfully");
    } catch (e) {
      console.error("[Edge Function] Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { recipient, apiKey, templateId } = requestBody;
    
    console.log("[Edge Function] Request parameters received:", { 
      recipient, 
      templateId,
      apiKeyProvided: !!apiKey,
      timestampUTC: new Date().toISOString()
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

    // Use Crossmint staging API
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    
    // Simplified payload with only the essential data
    const mintPayload = {
      recipient: recipient,
      templateId: templateId
    };
    
    console.log(`[Edge Function] Sending request to Crossmint with payload:`, mintPayload);
    
    // Send payload to Crossmint API
    let response;
    try {
      response = await fetch(
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
      
      console.log("[Edge Function] Crossmint API response status:", response.status, response.statusText);
      
      const data = await response.json();
      console.log("[Edge Function] Response body:", JSON.stringify(data));
      
      // Return Crossmint's response directly
      return new Response(
        JSON.stringify(data),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (e) {
      console.error("[Edge Function] Failed to make request to Crossmint API:", e);
      return new Response(
        JSON.stringify({ error: `Network error: ${e.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("[Edge Function] Server error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
