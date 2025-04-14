
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
    const { recipient, apiKey, templateId, blockchain } = await req.json();
    
    console.log("Request parameters received:", { 
      recipient, 
      templateId, 
      blockchain,
      apiKeyProvided: !!apiKey,
      timestampUTC: new Date().toISOString()
    });
    
    if (!recipient || !apiKey || !templateId || !blockchain) {
      console.error("Missing required parameters:", { 
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate blockchain value
    const validBlockchains = ["ethereum-sepolia", "polygon-amoy", "chiliz", "solana"];
    if (!validBlockchains.includes(blockchain)) {
      const error = `Invalid blockchain type: ${blockchain}. Valid options are: ${validBlockchains.join(', ')}`;
      console.error(error);
      
      // Update record as failed
      await supabase
        .from("nft_mints")
        .update({ 
          status: "failed", 
          error_message: error,
          updated_at: new Date().toISOString()
        })
        .eq("recipient", recipient)
        .eq("template_id", templateId);
      
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

    // Validar el formato de recipient según el blockchain elegido
    const isEmailRecipient = recipient.includes("@");
    
    // Validación básica del formato de wallet según blockchain
    if (!isEmailRecipient) {
      // Para blockchains EVM (Ethereum, Polygon, Chiliz)
      const isEVMAddress = recipient.startsWith("0x") && recipient.length >= 40;
      const isEVMBlockchain = ["ethereum-sepolia", "polygon-amoy", "chiliz"].includes(blockchain);
      
      // Para Solana
      const isSolanaAddress = recipient.length >= 30 && !recipient.startsWith("0x");
      
      if ((isEVMBlockchain && !isEVMAddress) || (blockchain === "solana" && !isSolanaAddress)) {
        const error = `Invalid wallet format for ${blockchain}. ${isEVMBlockchain ? "Expected 0x format for EVM chains." : "Expected Solana address format."}`;
        console.error(error, { recipient, blockchain });
        
        // Actualizar registro como fallido
        await supabase
          .from("nft_mints")
          .update({ 
            status: "failed", 
            error_message: error,
            updated_at: new Date().toISOString()
          })
          .eq("recipient", recipient)
          .eq("template_id", templateId);
        
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

    // Updated recipient formatting logic for multiple blockchains
    const recipientFormat = recipient.includes("@") 
      ? `email:${recipient}:${blockchain}` 
      : `${recipient}:${blockchain}`;
      
    console.log(`Formatted recipient for ${blockchain}: ${recipientFormat}`);

    console.log(`Making request to Crossmint API for blockchain: ${blockchain}`);
    console.log(`Using template ID: ${templateId}`);
    
    // Usar API de staging de Crossmint
    const crossmintEndpoint = "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts";
    console.log(`Crossmint endpoint: ${crossmintEndpoint}`);
    
    const response = await fetch(
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

    const data = await response.json();
    console.log("Crossmint API response:", {
      status: response.status,
      statusText: response.statusText,
      data: JSON.stringify(data)
    });
    
    // Update the mint record in the database
    if (response.ok) {
      console.log(`Minting successful for ${recipient} on ${blockchain}`);
      
      // Find and update the mint record
      const { error } = await supabase
        .from("nft_mints")
        .update({ 
          status: "minted",
          updated_at: new Date().toISOString(),
          error_message: null // Limpiar cualquier error previo
        })
        .eq("recipient", recipient)
        .eq("template_id", templateId);

      if (error) {
        console.error("Error updating record:", error);
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
      console.error(`Minting failed for ${recipient} on ${blockchain}. Error:`, errorMessage);
      
      // Update record as failed with detailed error message
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
        console.error("Error updating record:", error);
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
    console.error("Server error:", error);
    
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
