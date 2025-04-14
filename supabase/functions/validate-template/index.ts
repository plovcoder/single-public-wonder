
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

    if ((!templateId && !collectionId) || !apiKey) {
      console.error('[Validate Template] Missing required parameters - templateId/collectionId or apiKey');
      return new Response(
        JSON.stringify({ error: true, message: "Missing required parameters: templateId/collectionId and apiKey" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // First, attempt to validate the collection ID
    if (collectionId) {
      console.log(`[Validate Template] Validating collection: ${collectionId}`);
      
      // This is the URL for the Crossmint Collections API (staging)
      const collectionUrl = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}`;
      console.log(`[Validate Template] Calling Crossmint API for collection: ${collectionUrl}`);

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
      console.log(`[Validate Template] Collection response data:`, collectionData);

      if (collectionResponse.status === 200) {
        console.log(`[Validate Template] Collection validation successful for ${collectionId}`);
        
        // Collection is valid, now try to get template details if template ID was provided
        if (templateId) {
          // Now validate the template within this collection
          console.log(`[Validate Template] Validating template: ${templateId} in collection: ${collectionId}`);
          
          // Fetch templates for this collection
          const templatesUrl = `https://staging.crossmint.com/api/2022-06-09/collections/${collectionId}/templates`;
          console.log(`[Validate Template] Calling Crossmint API for templates: ${templatesUrl}`);
          
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
            
            // Find the specific template in the collection - FIXED: use templateId instead of id
            const templateData = templatesData.find(t => t.templateId === templateId);
            
            if (templateData) {
              console.log(`[Validate Template] Found template: ${templateId}`);
              
              // Format a response combining collection and template data
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
              // Template not found in this collection
              console.log(`[Validate Template] Template ${templateId} not found in collection ${collectionId}`);
              
              // Return the collection info without template-specific details
              const formattedResponse = {
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
              };
              
              return new Response(
                JSON.stringify(formattedResponse),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else {
            // Could not get templates, just return collection info
            console.log(`[Validate Template] Could not fetch templates for collection ${collectionId}`);
            
            const formattedResponse = {
              id: collectionId,
              name: collectionData.metadata?.name,
              description: collectionData.metadata?.description,
              metadata: {
                image: collectionData.metadata?.imageUrl || collectionData.metadata?.image
              },
              chain: collectionData.onChain?.chain,
              readableChain: getReadableChainName(collectionData.onChain?.chain),
              compatibleWallets: getCompatibleWallets(collectionData.onChain?.chain)
            };
            
            return new Response(
              JSON.stringify(formattedResponse),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // No template ID provided, just return collection info
          const formattedResponse = {
            id: collectionId,
            name: collectionData.metadata?.name,
            description: collectionData.metadata?.description,
            metadata: {
              image: collectionData.metadata?.imageUrl || collectionData.metadata?.image
            },
            chain: collectionData.onChain?.chain,
            readableChain: getReadableChainName(collectionData.onChain?.chain),
            compatibleWallets: getCompatibleWallets(collectionData.onChain?.chain)
          };
          
          return new Response(
            JSON.stringify(formattedResponse),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // If we reach here, either collection validation failed or only template ID was provided
    if (templateId) {
      console.log(`[Validate Template] Validating template directly: ${templateId}`);
      
      // Since the direct template endpoint doesn't work, and we need a collection to find templates,
      // return an error if we only have a template ID without a valid collection
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: "Template ID cannot be validated without a valid Collection ID. Please provide both."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // If we reach here, both collection and template validation failed
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: "No se pudo validar el Collection ID ni el Template ID. Verifica tus credenciales y que estés usando el entorno correcto."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
    
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
