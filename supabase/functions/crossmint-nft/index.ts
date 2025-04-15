import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { recipient, apiKey, templateId, collectionId, blockchain } = requestBody;
    
    console.log("[Edge Function] Request received:", {
      recipient,
      templateId,
      collectionId,
      blockchain,
      apiKeyProvided: !!apiKey
    });
    
    if (!recipient || !apiKey || !collectionId) {
      console.error("[Edge Function] Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing required parameters. Need recipient, apiKey, and collectionId" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Format the recipient address - could be email or wallet address
    let formattedRecipient;
    
    // Handle wallet addresses (starting with 0x)
    if (recipient.startsWith('0x')) {
      formattedRecipient = `${blockchain}:${recipient}`;
      console.log(`[Edge Function] Formatted wallet address using blockchain ${blockchain}`);
    } 
    // Handle email recipients
    else if (recipient.includes('@')) {
      formattedRecipient = `email:${recipient}:${blockchain}`;
      console.log(`[Edge Function] Formatted email using blockchain ${blockchain}`);
    }
    // Otherwise use as is (might already be formatted)
    else {
      formattedRecipient = recipient;
      console.log(`[Edge Function] Using recipient as-is, appears to be pre-formatted`);
    }
    
    console.log(`[Edge Function] Using formatted recipient: ${formattedRecipient}`);
    
    const crossmintEndpoint = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`;
    
    console.log(`[Edge Function] Using endpoint: ${crossmintEndpoint}`);
    console.log(`[Edge Function] Using blockchain: ${blockchain}`);
    
    // Create the mint payload
    const mintPayload: Record<string, string> = {
      recipient: formattedRecipient,
    };
    
    // ALWAYS include templateId if it's provided
    if (templateId) {
      mintPayload.templateId = templateId;
      console.log(`[Edge Function] Including templateId in payload: ${templateId}`);
    }
    
    console.log(`[Edge Function] Final payload being sent to Crossmint:`, mintPayload);
    
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
    
    const responseText = await response.text();
    console.log(`[Edge Function] Crossmint raw response (${response.status}):`, responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`[Edge Function] Parsed response data:`, responseData);
    } catch (e) {
      console.error(`[Edge Function] Failed to parse response:`, e);
      responseData = { text: responseText };
    }
    
    if (!response.ok) {
      console.error(`[Edge Function] Crossmint API error (${response.status}):`, responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.message || "Error from Crossmint API",
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
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
