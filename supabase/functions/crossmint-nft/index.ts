
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

    // Format the recipient address for Chiliz blockchain
    const formattedRecipient = recipient.startsWith('0x') ? `chiliz:${recipient}` : recipient;
    
    // Crossmint staging API
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    
    const mintPayload = {
      recipient: formattedRecipient,
      templateId
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
