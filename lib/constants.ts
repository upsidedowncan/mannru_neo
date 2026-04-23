import { CardTier } from './db';

export const TIER_PRICES: Record<CardTier, number> = {
  standard: 0,
  gold: 5000,
  platinum: 15000,
  black: 50000,
};
