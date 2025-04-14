
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
    const { recipient, apiKey, templateId } = await req.json();
    
    if (!recipient || !apiKey || !templateId) {
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

    // Make request to Crossmint API
    const recipientFormat = recipient.includes("@") 
      ? `email:${recipient}:solana` 
      : recipient;

    const response = await fetch(
      "https://staging.crossmint.com/api/2022-06-09/collections/default/nfts",
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
    
    // Update the mint record in the database
    if (response.ok) {
      // Find and update the mint record
      const { error } = await supabase
        .from("nft_mints")
        .update({ 
          status: "minted",
          updated_at: new Date().toISOString()
        })
        .eq("recipient", recipient)
        .eq("template_id", templateId);

      if (error) {
        console.error("Error updating record:", error);
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } else {
      // Update record as failed
      const { error } = await supabase
        .from("nft_mints")
        .update({ 
          status: "failed", 
          error_message: data.message || "Unknown error",
          updated_at: new Date().toISOString()
        })
        .eq("recipient", recipient)
        .eq("template_id", templateId);

      if (error) {
        console.error("Error updating record:", error);
      }

      return new Response(
        JSON.stringify({ success: false, error: data }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
