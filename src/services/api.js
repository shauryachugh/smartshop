/**
 * Central API Service Layer (Foundation for Netlify Functions, Supabase & Gemini AI)
 * 
 * In subsequent phases, this file will handle:
 * - Product fetching & filtering (Supabase)
 * - AI conversational prompts (Gemini API via Netlify Functions)
 * - Natural language search query processing
 */

const API_BASE = '/.netlify/functions';

export const apiService = {
  /**
   * Healthcheck endpoint
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch (error) {
      console.warn('API health check skipped in Phase 1 mock mode:', error.message);
      return { status: 'mock_mode', message: 'Phase 1 development environment' };
    }
  },
};
