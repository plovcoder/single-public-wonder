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
    const { recipient, apiKey, templateId, blockchain } = requestBody;
    
    console.log("[Edge Function] Request received:", {
      recipient,
      templateId,
      blockchain,
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

    // Format the recipient address - could be email or wallet address
    let formattedRecipient;
    
    // Use the blockchain provided in the request instead of hardcoding "chiliz"
    const chainForFormatting = blockchain || "chiliz";
    
    // Handle wallet addresses (starting with 0x)
    if (recipient.startsWith('0x')) {
      formattedRecipient = `${chainForFormatting}:${recipient}`;
      console.log(`[Edge Function] Formatted wallet address using blockchain ${chainForFormatting}`);
    } 
    // Handle email recipients
    else if (recipient.includes('@')) {
      formattedRecipient = `email:${recipient}:${chainForFormatting}`;
      console.log(`[Edge Function] Formatted email using blockchain ${chainForFormatting}`);
    }
    // Otherwise use as is (might already be formatted)
    else {
      formattedRecipient = recipient;
      console.log(`[Edge Function] Using recipient as-is, appears to be pre-formatted`);
    }
    
    console.log(`[Edge Function] Using formatted recipient: ${formattedRecipient}`);
    
    // Use the templateId directly as the collection ID
    const crossmintEndpoint = `https://staging.crossmint.com/api/2022-06-09/collections/${templateId}/nfts`;
    
    console.log(`[Edge Function] Using endpoint: ${crossmintEndpoint}`);
    
    // Include the templateId in the request body
    const mintPayload = {
      recipient: formattedRecipient,
      templateId: templateId  // Add templateId to the payload
    };
    
    console.log(`[Edge Function] Sending request to Crossmint:`, mintPayload);
    
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
    console.log(`[Edge Function] Crossmint response (${response.status}):`, responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
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
