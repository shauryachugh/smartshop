/**
 * ShopSmart AI — Frontend AI Concierge Service
 * Interacts with backend Netlify function: /.netlify/functions/shopping-assistant
 * 
 * Powered by Google Gemini API (@google/genai) on the serverless backend
 */

const FUNCTION_ENDPOINT = '/.netlify/functions/shopping-assistant';

export const aiService = {
  /**
   * Send a message to the Gemini AI shopping assistant
   * @param {Object} params
   * @param {string} params.message - Customer message
   * @param {Array} params.conversationHistory - Recent conversation history
   * @returns {Promise<{success: boolean, reply: string, products: Array, comparison: Object|null, modelUsed: string}>}
   */
  async sendMessage({ message, conversationHistory = [] }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new Error('Message is required.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const response = await fetch(FUNCTION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          conversationHistory: conversationHistory.slice(-10),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('You are sending messages too quickly. Please pause for a few seconds before trying again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: Boolean(data.success),
        reply: data.reply || 'Here are the recommended items from our catalogue:',
        products: Array.isArray(data.products) ? data.products : [],
        comparison: data.comparison || null,
        modelUsed: data.modelUsed || 'gemini',
        notice: data.notice || null,
        warning: data.warning || null,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }

      console.error('[aiService] Request error:', err.message);
      throw err;
    }
  },
};
