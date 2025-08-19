import { extractLearningMetadata, generateChatResponse } from './llmApi.js';
import { searchWLO, normalizeWLONode } from './wloApi.js';
import { FACH_MAPPING, INHALTSTYP_MAPPING, BILDUNGSSTUFE_MAPPING } from './mappings.js';
import { createWLOSearchParams } from './types.js';

export async function processUserMessage(userText, messages, settings) {
  try {
    let wloSuggestions = [];
    
    // Only search WLO if enabled in settings
    if (settings.enableWLO) {
      try {
        // Extract learning metadata from user text
        const metadata = await extractLearningMetadata(userText, settings);
        
        // Build search parameters based on metadata
        const searchParams = buildWLOSearchParams(metadata);
        
        if (searchParams.properties.length > 0) {
          // Search WLO for relevant content
          console.log('DEBUG: settings.sourceFilter in chatUtils =', settings.sourceFilter);
          const wloResults = await searchWLO({
            ...searchParams,
            sourceFilter: settings.sourceFilter,
            environment: settings.environment || 'production'
          });
          
          // Normalize and limit results to 10
          wloSuggestions = wloResults.nodes
            .map(normalizeWLONode)
            .slice(0, 10);
        }
      } catch (wloError) {
        console.warn('WLO search failed, continuing without WLO content:', wloError);
        // Continue without WLO content if search fails
      }
    }
    
    // Generate chat response with WLO content (append current user message)
    const messagesWithUser = [
      ...messages,
      { role: 'user', content: userText }
    ];
    const response = await generateChatResponse(messagesWithUser, wloSuggestions, settings);
    
    return {
      ...response,
      wloSuggestions
    };
    
  } catch (error) {
    console.error('Error processing user message:', error);
    throw error;
  }
}

function buildWLOSearchParams(metadata) {
  const properties = [];
  const values = [];
  
  // Add topic as search term
  if (metadata.topic) {
    properties.push('cclom:title');
    values.push(metadata.topic);
  }
  
  // Add subject filter if available
  if (metadata.subject && FACH_MAPPING[metadata.subject]) {
    properties.push('ccm:taxonid');
    values.push(FACH_MAPPING[metadata.subject]);
  }
  
  // Add content type filter if available
  if (metadata.content_type && INHALTSTYP_MAPPING[metadata.content_type]) {
    properties.push('ccm:oeh_lrt_aggregated');
    values.push(INHALTSTYP_MAPPING[metadata.content_type]);
  }
  
  // Add educational level filter if available
  if (metadata.educational_level && BILDUNGSSTUFE_MAPPING[metadata.educational_level]) {
    properties.push('ccm:educationalcontext');
    values.push(BILDUNGSSTUFE_MAPPING[metadata.educational_level]);
  }
  
  return createWLOSearchParams(properties, values, 10, 0, '-all-', 'OR');
}

export function formatWLOSuggestion(suggestion, environment = 'production') {
  const baseUrl = environment === 'staging' 
    ? 'https://repository.staging.openeduhub.net/edu-sharing' 
    : 'https://redaktion.openeduhub.net/edu-sharing';
    
  const url = suggestion.wwwUrl || 
              (suggestion.refId ? `${baseUrl}/components/render/${suggestion.refId}` : '#');
  
  return {
    title: suggestion.title,
    url: url,
    description: suggestion.description,
    resourceType: suggestion.resourceType,
    subject: suggestion.subject
  };
}
