import axios from 'axios';
import { normalizeWLOMetadata } from './types.js';

export async function searchWLO({
  properties,
  values,
  maxItems = 10,
  skipCount = 0,
  propertyFilter = '-all-',
  combineMode = 'OR',
  sourceFilter = null,
  environment = 'production'
}) {
  try {
    // Construct the search criteria array
    const criteria = [];
    
    // Add title/search word as first criterion
    if (properties.includes('cclom:title') && values[0]) {
      criteria.push({
        property: 'ngsearchword',
        values: [values[0]]
      });
    }

    // Map old property names to new ones
    const propertyMapping = {
      'ccm:oeh_lrt_aggregated': 'ccm:oeh_lrt_aggregated',
      'ccm:taxonid': 'virtual:taxonid',
      'ccm:educationalcontext': 'ccm:educationalcontext'
    };

    // Add remaining criteria with mapped properties
    for (let i = 0; i < properties.length; i++) {
      if (properties[i] !== 'cclom:title' && values[i]) {
        criteria.push({
          property: propertyMapping[properties[i]] || properties[i],
          values: [values[i]]
        });
      }
    }

    // Add source filter if specified
    console.log('DEBUG: sourceFilter in wloApi =', sourceFilter);
    if (sourceFilter && sourceFilter.trim()) {
      console.log('DEBUG: Adding ccm:oeh_publisher_combined with value:', sourceFilter.trim());
      criteria.push({
        property: 'ccm:oeh_publisher_combined',
        values: [sourceFilter.trim()]
      });
    }

    const searchParams = new URLSearchParams({
      contentType: 'FILES',
      maxItems: maxItems.toString(),
      skipCount: skipCount.toString(),
      propertyFilter
    });

    // Select API endpoint based on environment
    const apiEndpoint = environment === 'staging' ? '/api/edu-sharing-staging' : '/api/edu-sharing';
    const url = `${apiEndpoint}/rest/search/v1/queries/-home-/mds_oeh/ngsearch?${searchParams}`;

    const response = await axios.post(
      url,
      { criteria },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`WLO API request failed: ${error.message} (${error.response?.status} ${error.response?.statusText})`);
    } else {
      throw new Error('WLO API request failed: Unknown error occurred');
    }
  }
}

export function normalizeWLONode(node) {
  return normalizeWLOMetadata(node);
}
