import client from './client';
import {
  BrentSignal,
  BrentSignalSchema,
  ConversionLogCreate,
  ConversionLogCreateSchema,
  ConversionLogRecord,
  ConversionLogRecordSchema,
  EngineNotification,
  EngineNotificationSchema,
  EnginePeriod,
  GarchRiskItem,
  GarchRiskItemSchema,
  LostRevenueReport,
  LostRevenueReportSchema,
  MonthlySavingsReport,
  MonthlySavingsReportSchema,
  MultiCurrencyExposureResponse,
  MultiCurrencyExposureResponseSchema,
  NewsSignalResponse,
  NewsSignalResponseSchema,
  RateAlertCreate,
  RateAlertCreateSchema,
  RateAlertResponse,
  RateAlertResponseSchema,
  ReservesSignalResponse,
  ReservesSignalResponseSchema,
  SeasonalityResponse,
  SeasonalityResponseSchema,
  SimulatorRequest,
  SimulatorRequestSchema,
  SimulatorResult,
  SimulatorResultSchema,
  SourceHealthResponse,
  SourceHealthResponseSchema,
  SpreadResponse,
  SpreadResponseSchema,
  InterventionSignalResponse,
  InterventionSignalResponseSchema,
} from '@/types/engine';

export async function getCurrentSpread(): Promise<SpreadResponse> {
  const response = await client.get('/engine/spread/current');
  return SpreadResponseSchema.parse(response.data);
}

export async function getBrentSignal(): Promise<BrentSignal> {
  const response = await client.get('/engine/signals/brent');
  return BrentSignalSchema.parse(response.data);
}

export async function getSourceHealth(): Promise<SourceHealthResponse> {
  const response = await client.get('/engine/sources/health');
  return SourceHealthResponseSchema.parse(response.data);
}

export async function runSimulator(payload: SimulatorRequest): Promise<SimulatorResult> {
  const response = await client.post(
    '/engine/simulator',
    SimulatorRequestSchema.parse(payload),
  );
  return SimulatorResultSchema.parse(response.data);
}

export async function createRateAlert(payload: RateAlertCreate): Promise<RateAlertResponse> {
  const response = await client.post(
    '/engine/alerts',
    RateAlertCreateSchema.parse(payload),
  );
  return RateAlertResponseSchema.parse(response.data);
}

export async function listRateAlerts(): Promise<RateAlertResponse[]> {
  const response = await client.get('/engine/alerts');
  return RateAlertResponseSchema.array().parse(response.data);
}

export async function deleteRateAlert(alertId: string): Promise<void> {
  await client.delete(`/engine/alerts/${alertId}`);
}

export async function listEngineNotifications(): Promise<EngineNotification[]> {
  const response = await client.get('/engine/notifications');
  return EngineNotificationSchema.array().parse(response.data);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await client.patch(`/engine/notifications/${notificationId}/read`, null);
}

export async function logConversion(
  payload: ConversionLogCreate,
): Promise<ConversionLogRecord> {
  const response = await client.post(
    '/engine/conversions',
    ConversionLogCreateSchema.parse(payload),
  );
  return ConversionLogRecordSchema.parse(response.data);
}

export async function getLostRevenueReport(
  period: EnginePeriod = '30d',
): Promise<LostRevenueReport> {
  const response = await client.get('/engine/analytics/lost-revenue', {
    params: { period },
  });
  return LostRevenueReportSchema.parse(response.data);
}

export async function getGarchRisk(
  pairs = 'USD/NGN,EUR/NGN,GBP/NGN',
  windowDays = 60,
): Promise<GarchRiskItem[]> {
  const response = await client.get('/engine/risk/garch', {
    params: { pairs, window_days: windowDays },
  });
  return GarchRiskItemSchema.array().parse(response.data);
}

export async function getSeasonalitySignal(): Promise<SeasonalityResponse> {
  const response = await client.get('/engine/signals/seasonality');
  return SeasonalityResponseSchema.parse(response.data);
}

export async function getNewsSignal(): Promise<NewsSignalResponse> {
  const response = await client.get('/engine/signals/news');
  return NewsSignalResponseSchema.parse(response.data);
}

export async function getReservesSignal(): Promise<ReservesSignalResponse> {
  const response = await client.get('/engine/signals/cbn-reserves');
  return ReservesSignalResponseSchema.parse(response.data);
}

export async function getInterventionSignal(): Promise<InterventionSignalResponse> {
  const response = await client.get('/engine/signals/intervention');
  return InterventionSignalResponseSchema.parse(response.data);
}

export async function getMultiCurrencyExposure(
  reportingCurrency = 'NGN',
): Promise<MultiCurrencyExposureResponse> {
  const response = await client.get('/engine/exposures/multi-currency', {
    params: { reporting_currency: reportingCurrency },
  });
  return MultiCurrencyExposureResponseSchema.parse(response.data);
}

export async function getMonthlySavingsReport(
  year?: number,
  month?: number,
): Promise<MonthlySavingsReport> {
  const response = await client.get('/engine/reports/monthly-savings', {
    params: { year, month },
  });
  return MonthlySavingsReportSchema.parse(response.data);
}
