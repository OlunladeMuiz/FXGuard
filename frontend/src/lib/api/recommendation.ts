import client from './client';
import {
  Recommendation,
  RecommendationResponseSchema,
  RecommendationAction,
} from '@/types/recommendation';

// Mock data flag
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true;

/**
 * Generate mock recommendation based on invoice ID
 */
const generateMockRecommendation = (invoiceId: string): Recommendation => {
  // Use invoice ID to generate deterministic but varied recommendations
  const hash = invoiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const actionIndex = hash % 4;
  const actions: RecommendationAction[] = ['convert_now', 'wait', 'hedge', 'split_conversion'];
  const selectedAction = actions[actionIndex] ?? 'convert_now';
  
  const confidence = 0.6 + (hash % 40) / 100; // 0.6-0.99
  const riskScore = (hash % 100) / 100; // 0-0.99
  const volatility = 0.2 + (hash % 60) / 100; // 0.2-0.79

  const explanations: Record<RecommendationAction, string> = {
    convert_now: 'Current market conditions are favorable with USD/NGN rates near monthly highs. Converting now locks in advantageous rates before potential market shifts.',
    wait: 'Historical patterns suggest rates may improve within the next 5-7 days. Current volatility is low, making it safe to wait for better conditions.',
    hedge: 'Market volatility is elevated. Consider hedging 50% of the amount now and the remainder over the next two weeks to mitigate risk.',
    split_conversion: 'Optimal strategy is to convert in tranches. Convert 40% immediately at current favorable rates and schedule the remainder over 2 weeks.',
  };

  const trends: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable'];
  const selectedTrend = trends[hash % 3] ?? 'stable';
  const alternativeAction = actions[(actionIndex + 1) % 4] ?? 'wait';

  return {
    invoiceId,
    action: selectedAction,
    confidence: Math.min(confidence, 0.95),
    explanation: explanations[selectedAction],
    riskScore,
    factors: [
      {
        name: 'Market Volatility',
        impact: volatility > 0.5 ? 'negative' : 'positive',
        description: `Current volatility index is ${(volatility * 100).toFixed(1)}%`,
      },
      {
        name: 'Rate Trend',
        impact: selectedAction === 'convert_now' ? 'positive' : 'neutral',
        description: 'USD/NGN showing upward momentum over 7 days',
      },
      {
        name: 'Economic Indicators',
        impact: 'neutral',
        description: 'Central bank policy remains stable',
      },
    ],
    alternativeActions: [
      {
        action: alternativeAction,
        confidence: confidence - 0.15,
        reason: 'Alternative approach based on conservative risk tolerance',
      },
    ],
    marketConditions: {
      volatility,
      trend: selectedTrend,
      momentum: (hash % 200 - 100) / 100, // -1 to 1
    },
    createdAt: new Date().toISOString(),
  };
};

/**
 * Fetch recommendation for an invoice
 * @param invoiceId - Invoice ID to get recommendation for
 * @returns Recommendation data
 */
export const fetchRecommendation = async (invoiceId: string): Promise<Recommendation> => {
  if (USE_MOCK) {
    console.log('[DEV] Using mock recommendation');
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockRecommendation(invoiceId);
  }

  try {
    const response = await client.get(`/recommendation/${invoiceId}`);
    const validated = RecommendationResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    console.warn('[API] Recommendation fetch failed, using mock data');
    return generateMockRecommendation(invoiceId);
  }
};

/**
 * Fetch batch recommendations for multiple invoices
 * @param invoiceIds - Array of invoice IDs
 * @returns Map of invoice ID to recommendation
 */
export const fetchBatchRecommendations = async (
  invoiceIds: string[]
): Promise<Map<string, Recommendation>> => {
  if (USE_MOCK) {
    console.log('[DEV] Using mock batch recommendations');
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const recommendationsMap = new Map<string, Recommendation>();
    invoiceIds.forEach((id) => {
      recommendationsMap.set(id, generateMockRecommendation(id));
    });
    return recommendationsMap;
  }

  try {
    const response = await client.post('/recommendations/batch', { invoiceIds });
    const recommendations = response.data.data as Recommendation[];
    
    const recommendationsMap = new Map<string, Recommendation>();
    recommendations.forEach((rec) => {
      recommendationsMap.set(rec.invoiceId, rec);
    });
    return recommendationsMap;
  } catch (error) {
    console.warn('[API] Batch recommendations fetch failed, using mock data');
    const recommendationsMap = new Map<string, Recommendation>();
    invoiceIds.forEach((id) => {
      recommendationsMap.set(id, generateMockRecommendation(id));
    });
    return recommendationsMap;
  }
};

/**
 * Refresh recommendation for an invoice
 * Forces a new calculation based on latest market data
 * @param invoiceId - Invoice ID
 * @returns Fresh recommendation
 */
export const refreshRecommendation = async (invoiceId: string): Promise<Recommendation> => {
  if (USE_MOCK) {
    console.log('[DEV] Refreshing mock recommendation');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return generateMockRecommendation(invoiceId);
  }

  try {
    const response = await client.post(`/recommendation/${invoiceId}/refresh`);
    const validated = RecommendationResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    console.warn('[API] Recommendation refresh failed, using mock data');
    return generateMockRecommendation(invoiceId);
  }
};
