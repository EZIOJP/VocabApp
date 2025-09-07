// ============================================================================
// MODULAR API FUNCTIONS FOR UNIVERSAL READ MODE - PAGINATION SUPPORT - FIXED
// ============================================================================

import { API_BASE_URL } from "../apiConfig";

const API_BASE = API_BASE_URL;

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// ============================================================================
// PAGINATED FETCH FUNCTIONS - Use these for better performance
// ============================================================================

// Fetch all words with pagination support
export const fetchAllWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  const result = await handleResponse(response);
  
  // Ensure consistent response format
  if (result.words) {
    return result; // Already paginated response
  } else {
    // Legacy response - convert to paginated format
    return {
      words: result,
      pagination: {
        limit: limit,
        offset: offset,
        returned: result.length,
        total_available: result.length,
        has_more: false
      }
    };
  }
};

// Fetch words with user progress included (paginated)
export const fetchWordsWithProgress = async (options = {}) => {
  return fetchAllWords(options);
};

// Fetch low mastery words (mastery <= 0)
export const fetchLowMasteryWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('mastery_max', '0');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch struggling words (mastery < 0)
export const fetchStrugglingWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('mastery_max', '-1');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch learning words (mastery 0-2)
export const fetchLearningWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('mastery_min', '0');
  params.append('mastery_max', '2');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch practicing words (mastery 3-5)
export const fetchPracticingWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('mastery_min', '3');
  params.append('mastery_max', '5');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch mastered words (mastery >= 6)
export const fetchMasteredWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('mastery_min', '6');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch due for review words
export const fetchDueReviewWords = async (options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('due_for_review', 'true');
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch words by specific group (paginated)
export const fetchGroupWords = async (groupNumber, options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const params = new URLSearchParams();
  params.append('group', groupNumber);
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch words by specific IDs
export const fetchWordsByIds = async (wordIds, options = {}) => {
  const { limit = 30, offset = 0 } = options;
  
  const idsString = Array.isArray(wordIds) ? wordIds.join(',') : wordIds;
  const params = new URLSearchParams();
  params.append('word_ids', idsString);
  params.append('limit', limit);
  params.append('offset', offset);
  
  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// Fetch words with custom criteria (paginated)
export const fetchWordsByCriteria = async (criteria = {}) => {
  const params = new URLSearchParams();
  
  // Add default pagination if not provided
  if (!criteria.limit) criteria.limit = 30;
  if (!criteria.offset) criteria.offset = 0;
  
  // Add all provided criteria to params
  Object.keys(criteria).forEach(key => {
    if (criteria[key] !== undefined && criteria[key] !== null) {
      params.append(key, criteria[key]);
    }
  });

  const response = await fetch(`${API_BASE}/words/by-criteria/?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  return handleResponse(response);
};

// ============================================================================
// WORD ACTIONS - BATCHED FOR PERFORMANCE
// ============================================================================

// Mark word as read (single)
export const markSwipeRead = async (wordId) => {
  const response = await fetch(`${API_BASE}/words/mark-read/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: wordId }),
  });
  return handleResponse(response);
};

// Mark multiple words as read (batch) - NEW
export const markMultipleWordsRead = async (wordIds) => {
  const promises = wordIds.map(id => markSwipeRead(id));
  return Promise.allSettled(promises);
};

// Legacy function (keeping for compatibility)
export const markWordRead = markSwipeRead;

// ============================================================================
// DASHBOARD DATA
// ============================================================================

// Get comprehensive dashboard data
export const fetchDashboardData = async () => {
  const response = await fetch(`${API_BASE}/quiz/dashboard/`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
};

// ============================================================================
// UPDATED CONFIGURATIONS WITH PAGINATION
// ============================================================================

export const ReadModeConfigs = {
  allWords: {
    title: "All Words",
    fetchWords: fetchWordsWithProgress,
    allowFiltering: true,
    markAsRead: true,
  },

  lowMastery: {
    title: "Low Mastery Words",
    fetchWords: fetchLowMasteryWords,
    allowFiltering: false,
    markAsRead: true,
  },

  struggling: {
    title: "Struggling Words", 
    fetchWords: fetchStrugglingWords,
    allowFiltering: false,
    markAsRead: true,
  },

  learning: {
    title: "Learning Phase",
    fetchWords: fetchLearningWords,
    allowFiltering: true,
    markAsRead: true,
  },

  practicing: {
    title: "Practicing Phase",
    fetchWords: fetchPracticingWords,
    allowFiltering: true,
    markAsRead: false,
  },

  mastered: {
    title: "Mastered Words",
    fetchWords: fetchMasteredWords,
    allowFiltering: false,
    markAsRead: false,
  },

  dueReview: {
    title: "Due for Review",
    fetchWords: fetchDueReviewWords,
    allowFiltering: false,
    markAsRead: false,
  },

  // Cycle mode - all words with enhanced filtering
  cycle: {
    title: "Cycle Mode",
    fetchWords: fetchWordsWithProgress,
    allowFiltering: true,
    markAsRead: true,
  }
};

// Factory function to create custom configurations
export const createReadModeConfig = ({
  title = "Custom Read Mode",
  fetchWords,
  allowFiltering = true,
  markAsRead = true,
  onWordChange = null,
  customFilters = []
}) => {
  if (!fetchWords || typeof fetchWords !== 'function') {
    throw new Error('fetchWords function is required');
  }

  return {
    title,
    fetchWords,
    allowFiltering,
    markAsRead,
    onWordChange,
    customFilters
  };
};

// Group-specific configuration factory (with pagination)
export const createGroupReadModeConfig = (groupNumber) => ({
  title: `Group ${groupNumber}`,
  fetchWords: (options) => fetchGroupWords(groupNumber, options),
  allowFiltering: false,
  markAsRead: true,
});

// Word IDs specific configuration factory
export const createWordIdsReadModeConfig = (wordIds, title = "Selected Words") => ({
  title,
  fetchWords: (options) => fetchWordsByIds(wordIds, options),
  allowFiltering: false,
  markAsRead: true,
});

// Custom by-criteria configuration factory
export const createCriteriaReadModeConfig = (criteria, title = "Filtered Words") => ({
  title,
  fetchWords: (options) => fetchWordsByCriteria({ ...criteria, ...options }),
  allowFiltering: false,
  markAsRead: true,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get word statistics for filtering
export const getWordStats = async () => {
  const dashboardData = await fetchDashboardData();
  return dashboardData.mastery_distribution;
};

// Get next actions/recommendations
export const getNextActions = async () => {
  const dashboardData = await fetchDashboardData();
  return dashboardData.next_actions;
};

// ============================================================================
// NAMED DEFAULT EXPORT (fixes ESLint warning)
// ============================================================================

const readModeAPI = {
  // Fetch functions
  fetchAllWords,
  fetchWordsWithProgress,
  fetchLowMasteryWords,
  fetchStrugglingWords,
  fetchLearningWords,
  fetchPracticingWords,
  fetchMasteredWords,
  fetchDueReviewWords,
  fetchGroupWords,
  fetchWordsByIds,
  fetchWordsByCriteria,

  // Actions
  markSwipeRead,
  markWordRead,
  markMultipleWordsRead,

  // Dashboard
  fetchDashboardData,

  // Configurations
  ReadModeConfigs,
  createReadModeConfig,
  createGroupReadModeConfig,
  createWordIdsReadModeConfig,
  createCriteriaReadModeConfig,

  // Utilities
  getWordStats,
  getNextActions
};

export default readModeAPI;
