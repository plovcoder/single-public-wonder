
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[Validate Template] Request received: ${new Date().toISOString()}`);

  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get('templateId');
    const apiKey = url.searchParams.get('apiKey');

    if (!templateId || !apiKey) {
      console.error('[Validate Template] Missing required parameters - templateId or apiKey');
      return new Response(
        JSON.stringify({ error: true, message: "Missing required parameters: templateId and apiKey" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[Validate Template] Validating template: ${templateId}`);

    // Now trying first to validate the template as a Collection
    // This is the URL for the Crossmint Collections API
    const collectionUrl = `https://staging.crossmint.com/api/2022-06-09/collections/${templateId}`;
    console.log(`[Validate Template] Calling Crossmint API: ${collectionUrl}`);

    const response = await fetch(
      collectionUrl,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log(`[Validate Template] Crossmint API response status: ${response.status}`);
    
    const responseData = await response.json();
    console.log(`[Validate Template] Response data:`, responseData);

    if (response.status === 200) {
      console.log(`[Validate Template] Template validation successful for ${templateId}`);
      
      // Extract useful information from the response
      const templateName = responseData.metadata?.name || 'not specified';
      const templateBlockchain = responseData.onChain?.chain || 'not specified';
      
      console.log(`[Validate Template] Template blockchain: ${templateBlockchain}`);
      console.log(`[Validate Template] Template name: ${templateName}`);
      
      // Format a nice response with all the needed info
      const formattedResponse = {
        id: responseData.id,
        name: responseData.metadata?.name,
        description: responseData.metadata?.description,
        metadata: {
          image: responseData.metadata?.imageUrl || responseData.metadata?.image
        },
        chain: responseData.onChain?.chain,
        readableChain: getReadableChainName(responseData.onChain?.chain),
        compatibleWallets: getCompatibleWallets(responseData.onChain?.chain)
      };
      
      return new Response(
        JSON.stringify(formattedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If we couldn't validate as a collection, we should try to validate as a template
      console.error(`[Validate Template] Template validation failed for ${templateId}: ${JSON.stringify(responseData)}`);
      
      // For now, just return the error
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }
  } catch (error) {
    console.error(`[Validate Template] Error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to get a readable name for the blockchain
function getReadableChainName(chain?: string): string {
  if (!chain) return '';
  
  const chainMap: Record<string, string> = {
    'polygon-amoy': 'Polygon Amoy (Testnet)',
    'ethereum-sepolia': 'Ethereum Sepolia (Testnet)',
    'solana': 'Solana',
    'chiliz': 'Chiliz',
  };
  
  return chainMap[chain] || chain;
}

// Helper function to get compatible wallet formats for a blockchain
function getCompatibleWallets(chain?: string): any {
  if (!chain) return {};
  
  const isEVM = chain.includes('polygon') || chain.includes('ethereum') || chain.includes('chiliz');
  const isSolana = chain.includes('solana');
  
  let walletPrefix = '';
  let recommendedAddressFormat = '';
  
  if (isEVM) {
    walletPrefix = `${chain}:0x...`;
    recommendedAddressFormat = 'Direcciones ETH que comienzan con 0x';
  } else if (isSolana) {
    walletPrefix = `${chain}:<solana-address>`;
    recommendedAddressFormat = 'Direcciones Solana';
  }
  
  return {
    isEVM,
    isSolana,
    walletPrefix,
    recommendedAddressFormat
  };
}
