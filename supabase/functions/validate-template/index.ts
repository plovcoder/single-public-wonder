
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, accept',
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
    const collectionId = url.searchParams.get('collectionId');

    console.log(`[Validate Template] Params received:`, {
      templateId,
      collectionId,
      hasApiKey: !!apiKey
    });

    if ((!templateId && !collectionId) || !apiKey) {
      console.error('[Validate Template] Missing required parameters');
      return new Response(
        JSON.stringify({ error: true, message: "Missing required parameters: templateId/collectionId and apiKey" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // First, attempt to validate the collection ID
    if (collectionId) {
      console.log(`[Validate Template] Validating collection: ${collectionId}`);
      
      const collectionUrl = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}`;
      console.log(`[Validate Template] Calling Crossmint Collection API: ${collectionUrl}`);

      const collectionResponse = await fetch(
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

      console.log(`[Validate Template] Collection API response status: ${collectionResponse.status}`);
      
      const collectionData = await collectionResponse.json();
      console.log(`[Validate Template] Collection response:`, collectionData);

      if (collectionResponse.status === 200) {
        console.log(`[Validate Template] Collection validation successful for ${collectionId}`);
        
        if (templateId) {
          console.log(`[Validate Template] Now validating template: ${templateId}`);
          
          const templatesUrl = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/templates`;
          console.log(`[Validate Template] Calling Templates API: ${templatesUrl}`);
          
          const templatesResponse = await fetch(
            templatesUrl,
            {
              method: 'GET',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          );

          if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            console.log(`[Validate Template] Templates response:`, templatesData);
            
            const templateData = templatesData.find(t => t.templateId === templateId);
            
            if (templateData) {
              console.log(`[Validate Template] Found matching template: ${templateId}`);
              console.log(`[Validate Template] Template blockchain:`, collectionData.onChain?.chain);
              
              const formattedResponse = {
                id: templateId,
                name: templateData.metadata?.name || collectionData.metadata?.name,
                description: templateData.metadata?.description || collectionData.metadata?.description,
                metadata: {
                  image: templateData.metadata?.imageUrl || templateData.metadata?.image
                },
                chain: collectionData.onChain?.chain,
                readableChain: getReadableChainName(collectionData.onChain?.chain),
                compatibleWallets: getCompatibleWallets(collectionData.onChain?.chain)
              };
              
              return new Response(
                JSON.stringify(formattedResponse),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log(`[Validate Template] Template ${templateId} not found in collection ${collectionId}`);
              return new Response(
                JSON.stringify({ 
                  id: collectionId,
                  name: collectionData.metadata?.name,
                  description: collectionData.metadata?.description,
                  metadata: {
                    image: collectionData.metadata?.imageUrl || collectionData.metadata?.image
                  },
                  chain: collectionData.onChain?.chain,
                  readableChain: getReadableChainName(collectionData.onChain?.chain),
                  compatibleWallets: getCompatibleWallets(collectionData.onChain?.chain),
                  templateNotFound: true
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            console.error(`[Validate Template] Failed to fetch templates:`, await templatesResponse.text());
            return new Response(
              JSON.stringify({ 
                error: true, 
                message: "Failed to validate template. Please check your API key and try again." 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }
        }
        
        return new Response(
          JSON.stringify({
            id: collectionId,
            name: collectionData.metadata?.name,
            description: collectionData.metadata?.description,
            metadata: {
              image: collectionData.metadata?.imageUrl || collectionData.metadata?.image
            },
            chain: collectionData.onChain?.chain,
            readableChain: getReadableChainName(collectionData.onChain?.chain),
            compatibleWallets: getCompatibleWallets(collectionData.onChain?.chain)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error(`[Validate Template] Collection validation failed:`, collectionData);
        return new Response(
          JSON.stringify({ 
            error: true, 
            message: collectionData.message || "Failed to validate collection" 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    // If we only have templateId, return error
    if (templateId) {
      console.error(`[Validate Template] Cannot validate template without collection:`, templateId);
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: "Cannot validate template without a valid collection ID. Please provide both." 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: "No se pudo validar el Collection ID ni el Template ID. Por favor verifica tus credenciales." 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
    
  } catch (error) {
    console.error(`[Validate Template] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function getReadableChainName(chain?: string): string {
  if (!chain) return '';
  
  const chainMap: Record<string, string> = {
    'polygon-amoy': 'Polygon Amoy (Testnet)',
    'ethereum-sepolia': 'Ethereum Sepolia (Testnet)',
    'solana': 'Solana',
    'chiliz': 'Chiliz',
  };
  
  return chainMap[chain.toLowerCase()] || chain;
}

function getCompatibleWallets(chain?: string): any {
  if (!chain) return {};
  
  const chainLower = chain.toLowerCase();
  const isEVM = chainLower.includes('polygon') || chainLower.includes('ethereum') || chainLower.includes('chiliz');
  const isSolana = chainLower.includes('solana');
  
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
