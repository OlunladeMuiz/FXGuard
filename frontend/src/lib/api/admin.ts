import client from './client';

export const ingestReserves = async (weekOf: string, reservesUsdBn: number) => {
  const response = await client.post('/engine/reserves', {
    week_of: weekOf,
    reserves_usd_bn: reservesUsdBn,
  });
  return response.data;
};
