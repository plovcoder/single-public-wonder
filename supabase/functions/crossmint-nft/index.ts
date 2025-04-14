
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        JSON.stringify({ error: "Invalid request body", details: e.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const { recipient, apiKey, templateId, blockchain } = requestBody;
    
    console.log("[Edge Function] Request parameters received:", { 
      recipient, 
      templateId, 
      blockchain,
      apiKeyProvided: !!apiKey,
      timestampUTC: new Date().toISOString()
    });
    
    if (!recipient || !apiKey || !templateId) {
      console.error("[Edge Function] Missing required parameters:", { 
        recipientProvided: !!recipient,
        apiKeyProvided: !!apiKey,
        templateIdProvided: !!templateId
      });
      
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    console.log("[Edge Function] Supabase configuration:", {
      urlProvided: !!supabaseUrl,
      keyProvided: !!supabaseKey,
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Edge Function] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[Edge Function] Supabase client created successfully");

    // Determine if the recipient is an email or a wallet address
    let recipientFormat;
    const isEmailRecipient = recipient.includes("@");
    
    if (isEmailRecipient) {
      // Format for email addresses using the special Crossmint format
      recipientFormat = `email:${recipient}:${blockchain}`;
      console.log(`[Edge Function] Formatted email recipient: ${recipientFormat}`);
    } else {
      // For wallet addresses - pass the address as-is with NO modifications
      recipientFormat = recipient;
      console.log(`[Edge Function] Using wallet address as-is without modifications: ${recipientFormat}`);
    }

    // Use Crossmint staging API
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    console.log(`[Edge Function] Crossmint endpoint: ${crossmintEndpoint}`);
    
    // First, validate the template to get information (but don't use for validation)
    let templateData;
    try {
      console.log(`[Edge Function] Getting template info from ID: ${templateId} for reference only`);
      const templateResponse = await fetch(
        `https://staging.crossmint.com/api/2022-06-09/collections/${templateId}`,
        {
          method: "GET", 
          headers: {
            "x-api-key": apiKey,
            "accept": "application/json",
          },
        }
      );
      
      if (templateResponse.ok) {
        templateData = await templateResponse.json();
        console.log(`[Edge Function] Template info retrieved successfully:`, {
          name: templateData.name,
          chain: templateData.chain,
          status: templateData.status
        });
      } else {
        console.warn(`[Edge Function] Could not get template info: ${templateId}`, await templateResponse.text());
        // Continue without template data - not blocking the mint
      }
    } catch (e) {
      console.warn(`[Edge Function] Error getting template info:`, e);
      // Continue without template data - not blocking the mint
    }
    
    let response;
    try {
      // Prepare the payload for Crossmint - simplified!
      const mintPayload = {
        recipient: recipientFormat,
        templateId: templateId
      };
      
      console.log(`[Edge Function] Sending request to Crossmint with payload:`, mintPayload);
      
      // Send payload to Crossmint API
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
      
      console.log("[Edge Function] Crossmint API request sent successfully");
      console.log("[Edge Function] Response status:", response.status, response.statusText);
    } catch (e) {
      console.error("[Edge Function] Failed to make request to Crossmint API:", e);
      
      // Update record as failed
      try {
        await supabase
          .from("nft_mints")
          .update({ 
            status: "failed", 
            error_message: `Network error: ${e.message}`,
            updated_at: new Date().toISOString()
          })
          .eq("recipient", recipient)
          .eq("template_id", templateId);
        console.log("[Edge Function] Updated record status to failed due to network error");
      } catch (updateError) {
        console.error("[Edge Function] Failed to update record status:", updateError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: `Network error: ${e.message}` },
          details: e.stack
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    let data;
    try {
      data = await response.json();
      console.log("[Edge Function] Response body:", JSON.stringify(data));
    } catch (e) {
      console.error("[Edge Function] Failed to parse Crossmint API response:", e);
      data = { error: "Failed to parse response" };
    }
    
    console.log("[Edge Function] Crossmint API response:", {
      status: response.status,
      statusText: response.statusText,
      data: JSON.stringify(data)
    });
    
    // Update the mint record in the database
    if (response.ok) {
      console.log(`[Edge Function] Minting successful for ${recipient}`);
      console.log(`[Edge Function] Template info:`, templateData || 'No template data available');
      
      // Find and update the mint record
      try {
        const { error } = await supabase
          .from("nft_mints")
          .update({ 
            status: "minted",
            updated_at: new Date().toISOString(),
            error_message: null // Clear any previous errors
          })
          .eq("recipient", recipient)
          .eq("template_id", templateId);

        if (error) {
          console.error("[Edge Function] Error updating record:", error);
        } else {
          console.log("[Edge Function] Successfully updated record status to minted");
        }
      } catch (e) {
        console.error("[Edge Function] Failed to update record:", e);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data,
          mintingDetails: {
            blockchain,
            recipientFormat,
            timestamp: new Date().toISOString(),
            templateInfo: templateData
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } else {
      const errorMessage = data.message || (data.error?.message || data.error) || "Unknown error from Crossmint API";
      console.error(`[Edge Function] Minting failed for ${recipient}. Error:`, errorMessage);
      console.error("[Edge Function] Full error response:", JSON.stringify(data));
      
      // Create user-friendly message for blockchain mismatch errors
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes("Invalid solana address") && !isEmailRecipient) {
        userFriendlyMessage = `Blockchain mismatch: This template (${templateData?.name || templateId}) is for the Solana blockchain, but you provided an EVM address (${recipient}). Please use a Solana wallet address or create a new template for EVM chains.`;
      } else if (errorMessage.includes("is not a valid ethereum") && !isEmailRecipient) {
        userFriendlyMessage = `Blockchain mismatch: This template (${templateData?.name || templateId}) is for an EVM blockchain, but you provided a non-EVM address (${recipient}). Please use an EVM wallet address (0x...) or create a new template for the appropriate blockchain.`;
      }
      
      // Update record as failed with detailed error message
      try {
        const { error } = await supabase
          .from("nft_mints")
          .update({ 
            status: "failed", 
            error_message: userFriendlyMessage,
            updated_at: new Date().toISOString()
          })
          .eq("recipient", recipient)
          .eq("template_id", templateId);

        if (error) {
          console.error("[Edge Function] Error updating record:", error);
        } else {
          console.log("[Edge Function] Successfully updated record status to failed");
        }
      } catch (e) {
        console.error("[Edge Function] Failed to update record:", e);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: {
            message: userFriendlyMessage,
            originalError: errorMessage,
            details: data
          },
          mintingDetails: {
            blockchain,
            recipientFormat,
            timestamp: new Date().toISOString(),
            templateInfo: templateData
          }
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("[Edge Function] Server error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
    );
  }
});
