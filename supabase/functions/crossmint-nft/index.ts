
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
    
    if (!recipient || !apiKey || !templateId || !blockchain) {
      console.error("[Edge Function] Missing required parameters:", { 
        recipientProvided: !!recipient,
        apiKeyProvided: !!apiKey,
        templateIdProvided: !!templateId,
        blockchainProvided: !!blockchain
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

    // Validate blockchain value
    const validBlockchains = ["ethereum-sepolia", "polygon-amoy", "chiliz", "solana"];
    if (!validBlockchains.includes(blockchain)) {
      const error = `Invalid blockchain type: ${blockchain}. Valid options are: ${validBlockchains.join(', ')}`;
      console.error("[Edge Function] " + error);
      
      // Update record as failed
      try {
        await supabase
          .from("nft_mints")
          .update({ 
            status: "failed", 
            error_message: error,
            updated_at: new Date().toISOString()
          })
          .eq("recipient", recipient)
          .eq("template_id", templateId);
        console.log("[Edge Function] Updated record status to failed due to invalid blockchain");
      } catch (e) {
        console.error("[Edge Function] Failed to update record status:", e);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: error } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate recipient format based on blockchain
    const isEmailRecipient = recipient.includes("@");
    
    // Basic validation of wallet format based on blockchain
    if (!isEmailRecipient) {
      // For EVM blockchains (Ethereum, Polygon, Chiliz)
      const isEVMAddress = recipient.startsWith("0x") && recipient.length >= 40;
      const isEVMBlockchain = ["ethereum-sepolia", "polygon-amoy", "chiliz"].includes(blockchain);
      
      // For Solana
      const isSolanaAddress = recipient.length >= 30 && !recipient.startsWith("0x");
      
      if ((isEVMBlockchain && !isEVMAddress) || (blockchain === "solana" && !isSolanaAddress)) {
        const error = `Invalid wallet format for ${blockchain}. ${isEVMBlockchain ? "Expected 0x format for EVM chains." : "Expected Solana address format."}`;
        console.error("[Edge Function] " + error, { recipient, blockchain });
        
        // Update record as failed
        try {
          await supabase
            .from("nft_mints")
            .update({ 
              status: "failed", 
              error_message: error,
              updated_at: new Date().toISOString()
            })
            .eq("recipient", recipient)
            .eq("template_id", templateId);
          console.log("[Edge Function] Updated record status to failed due to invalid recipient format");
        } catch (e) {
          console.error("[Edge Function] Failed to update record status:", e);
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: { message: error } 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Format recipient according to blockchain
    const recipientFormat = recipient.includes("@") 
      ? `email:${recipient}:${blockchain}` 
      : `${recipient}:${blockchain}`;
      
    console.log(`[Edge Function] Formatted recipient for ${blockchain}: ${recipientFormat}`);

    console.log(`[Edge Function] Making request to Crossmint API for blockchain: ${blockchain}`);
    console.log(`[Edge Function] Using template ID: ${templateId}`);
    
    // Use Crossmint staging API
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    console.log(`[Edge Function] Crossmint endpoint: ${crossmintEndpoint}`);
    
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
          body: JSON.stringify({
            recipient: recipientFormat,
            templateId: templateId
          }),
        }
      );
      
      console.log("[Edge Function] Crossmint API request sent successfully");
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
      console.log(`[Edge Function] Minting successful for ${recipient} on ${blockchain}`);
      
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
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } else {
      const errorMessage = data.message || data.error?.message || "Unknown error from Crossmint API";
      console.error(`[Edge Function] Minting failed for ${recipient} on ${blockchain}. Error:`, errorMessage);
      
      // Update record as failed with detailed error message
      try {
        const { error } = await supabase
          .from("nft_mints")
          .update({ 
            status: "failed", 
            error_message: errorMessage,
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
            message: errorMessage,
            details: data
          },
          mintingDetails: {
            blockchain,
            recipientFormat,
            timestamp: new Date().toISOString()
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
