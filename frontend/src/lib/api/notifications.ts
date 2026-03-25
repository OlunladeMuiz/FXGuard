import { fetchRecommendation } from './recommendation';
import { CurrencyCode } from '@/types/currency';
import { getActionDisplayText } from '@/types/recommendation';
import {
  SettingsNotification,
  SettingsNotificationSchema,
} from '@/types/settings';

interface NotificationPair {
  base: CurrencyCode;
  quote: CurrencyCode;
}

function getNotificationPairs(preferredCurrency: CurrencyCode): NotificationPair[] {
  const primaryBases: CurrencyCode[] = ['USD', 'EUR', 'GBP'];
  const pairs = primaryBases
    .filter((base) => base !== preferredCurrency)
    .map((base) => ({ base, quote: preferredCurrency }));

  return pairs.slice(0, 2);
}

function createNotification(input: SettingsNotification): SettingsNotification {
  return SettingsNotificationSchema.parse(input);
}

function buildMockNotifications(now: Date): SettingsNotification[] {
  return [
    createNotification({
      id: 'system-welcome',
      title: 'Welcome to FXGuard',
      message: 'Your FX control center is ready. Connect a payment provider to start generating executable payment links.',
      type: 'success',
      timestamp: new Date(now.getTime() - (1000 * 60 * 25)).toISOString(),
      source: 'system',
    }),
    createNotification({
      id: 'system-integrations-ready',
      title: 'Your integrations are ready',
      message: 'Paystack, Flutterwave, and Interswitch can be connected from Settings when you are ready to route settlements.',
      type: 'info',
      timestamp: new Date(now.getTime() - (1000 * 60 * 40)).toISOString(),
      source: 'system',
    }),
  ];
}

export async function getNotifications(
  preferredCurrency: CurrencyCode,
): Promise<SettingsNotification[]> {
  const now = new Date();
  const pairs = getNotificationPairs(preferredCurrency);
  const recommendations = await Promise.allSettled(
    pairs.map((pair) => fetchRecommendation(pair.base, pair.quote, 10000)),
  );

  const realNotifications: SettingsNotification[] = [];

  recommendations.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      return;
    }

    const recommendation = result.value;
    const pairLabel = `${recommendation.base}/${recommendation.quote}`;
    const timestamp = new Date(
      new Date(recommendation.generatedAt).getTime() - (index * 1000 * 60),
    ).toISOString();

    realNotifications.push(
      createNotification({
        id: `recommendation-${pairLabel}`,
        title: `${pairLabel}: ${getActionDisplayText(recommendation.action)}`,
        message: recommendation.explanation,
        type: recommendation.action === 'convert_now' ? 'success' : 'warning',
        timestamp,
        source: 'fx_recommendation',
      }),
    );

    if (index === 0) {
      const volatility = recommendation.indicators.volatilityPercent;
      realNotifications.push(
        createNotification({
          id: `volatility-${pairLabel}`,
          title: volatility > 1
            ? `High volatility detected in ${pairLabel}`
            : `Volatility stable in ${pairLabel}`,
          message: volatility > 1
            ? `${pairLabel} is showing ${volatility.toFixed(2)}% 30-day volatility. Consider using a hedge or split conversion if settlement timing is flexible.`
            : `${pairLabel} is currently trading with contained volatility at ${volatility.toFixed(2)}%, which supports steadier settlement planning.`,
          type: volatility > 1 ? 'warning' : 'info',
          timestamp: new Date(new Date(timestamp).getTime() - (1000 * 60 * 3)).toISOString(),
          source: 'volatility',
        }),
      );
    } else {
      const change7d = recommendation.indicators.change7dPercent;
      const direction = change7d >= 0 ? 'up' : 'down';
      realNotifications.push(
        createNotification({
          id: `movement-${pairLabel}`,
          title: `${pairLabel} moved ${direction} ${Math.abs(change7d).toFixed(2)}% over 7 days`,
          message: recommendation.indicators.isNearHigh
            ? `${pairLabel} is approaching its 30-day high. If you can wait, monitor for a pullback before executing a large conversion.`
            : recommendation.indicators.isNearLow
              ? `${pairLabel} is near the lower end of its 30-day range. This may be a favorable window to secure conversion value.`
              : `${pairLabel} remains inside its recent range. Staggering settlement can reduce timing risk while the market stays balanced.`,
          type: Math.abs(change7d) >= 1 ? 'warning' : 'info',
          timestamp: new Date(new Date(timestamp).getTime() - (1000 * 60 * 4)).toISOString(),
          source: 'rate_movement',
        }),
      );
    }
  });

  const notifications = [...realNotifications, ...buildMockNotifications(now)]
    .sort((left, right) => (
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    ));

  return notifications;
}
