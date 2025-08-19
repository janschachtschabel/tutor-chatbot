// Type definitions for WLO integration and chat functionality

export const ChatMessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

export const createChatMessage = (role, content, timestamp = Date.now(), wloSuggestions = []) => ({
  role,
  content,
  timestamp,
  wloSuggestions
});

export const createChatSettings = (useKissKI = false, enableWLO = true, debugMode = false, sourceFilter = '', environment = 'production') => ({
  useKissKI,
  enableWLO,
  debugMode,
  sourceFilter,
  environment
});

export const createLearningMetadata = (topic = '', subject = null, content_type = null) => ({
  topic,
  subject,
  content_type
});

export const createWLOSearchParams = (properties = [], values = [], maxItems = 10, skipCount = 0, propertyFilter = '-all-', combineMode = 'OR') => ({
  properties,
  values,
  maxItems,
  skipCount,
  propertyFilter,
  combineMode
});

// Helper function to fix local WLO links
const fixWLOLocalLink = (url) => {
  if (!url) return null;
  
  // Check if it's a ccrep://local/ link
  if (url.startsWith('ccrep://local/')) {
    // Extract UUID from the URL
    const uuid = url.replace('ccrep://local/', '');
    // Convert to proper openeduhub.net render URL
    return `https://redaktion.openeduhub.net/edu-sharing/components/render/${uuid}`;
  }
  
  return url;
};

export const normalizeWLOMetadata = (node) => ({
  title: node.properties?.['cclom:title']?.[0] || 
         node.properties?.['cm:title']?.[0] ||
         node.properties?.['cm:name']?.[0] ||
         'Untitled Resource',
  collectionId: node.properties?.['ccm:collectionid']?.[0] || '',
  hierarchyLevel: node.properties?.['ccm:hierarchyLevel']?.[0] || 1,
  parentPath: node.properties?.['ccm:parentPath']?.[0] || '',
  parentId: node.properties?.['ccm:parentId']?.[0] || '',
  refId: node.ref?.id || '',
  keywords: node.properties?.['cclom:general_keyword'] || [],
  description: node.properties?.['cclom:general_description']?.[0] || 
              node.properties?.['cm:description']?.[0] || '',
  subject: node.properties?.['ccm:taxonid_DISPLAYNAME']?.[0] || '',
  educationalContext: node.properties?.['ccm:educationalcontext_DISPLAYNAME'] || [],
  wwwUrl: fixWLOLocalLink(node.properties?.['cclom:location']?.[0] || 
          node.properties?.['ccm:wwwurl']?.[0]) || null,
  previewUrl: null,
  resourceType: node.properties?.['ccm:oeh_lrt_aggregated_DISPLAYNAME']?.[0] || 
               node.properties?.['ccm:resourcetype_DISPLAYNAME']?.[0] || 
               node.properties?.['ccm:oeh_lrt_aggregated']?.[0]?.split('/').pop() || 
               'Lernressource'
});
