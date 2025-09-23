import { AutomationSettings } from './automationService';

export interface PriceComponents {
  energy_price: number | null;
  tax_price: number | null;
  net_fee: number | null;
  total_consumer_price: number;
  source: string;
}

/**
 * Calculate the complete consumer price including all components
 */
export function calculateConsumerPrice(
  priceData: any,
  settings: AutomationSettings
): PriceComponents {
  const energyPrice = priceData.energy_price ? parseFloat(priceData.energy_price) : null;
  const taxPrice = priceData.tax_price ? parseFloat(priceData.tax_price) : null;
  const netFee = settings.net_fee_per_kwh || 0;
  
  let totalPrice = 0;
  let source = priceData.source || 'unknown';
  
  if (priceData.source === 'tibber') {
    // Tibber provides energy + tax, we add net fee
    if (energyPrice && taxPrice) {
      totalPrice = energyPrice + taxPrice + netFee;
    } else {
      // Fallback to stored total price + net fee
      totalPrice = parseFloat(priceData.price_value) + netFee;
    }
  } else if (priceData.source === 'elpriset') {
    // Elpriset provides base energy price only
    if (energyPrice) {
      // We need to estimate tax (typically 25% in Sweden)
      const estimatedTax = energyPrice * 0.25;
      totalPrice = energyPrice + estimatedTax + netFee;
    } else {
      // Fallback to stored price + estimated tax + net fee
      const basePrice = parseFloat(priceData.price_value);
      const estimatedTax = basePrice * 0.25;
      totalPrice = basePrice + estimatedTax + netFee;
    }
  } else {
    // Unknown source, use stored price as-is
    totalPrice = parseFloat(priceData.price_value);
  }
  
  return {
    energy_price: energyPrice,
    tax_price: taxPrice,
    net_fee: netFee,
    total_consumer_price: totalPrice,
    source: source
  };
}

/**
 * Get price breakdown for display
 */
export function getPriceBreakdown(components: PriceComponents): string {
  const parts = [];
  
  if (components.energy_price) {
    parts.push(`Energy: ${(components.energy_price * 100).toFixed(1)} öre`);
  }
  
  if (components.tax_price) {
    parts.push(`Tax: ${(components.tax_price * 100).toFixed(1)} öre`);
  } else if (components.energy_price) {
    const estimatedTax = components.energy_price * 0.25;
    parts.push(`Tax: ${(estimatedTax * 100).toFixed(1)} öre (est.)`);
  }
  
  if (components.net_fee) {
    parts.push(`Net: ${(components.net_fee * 100).toFixed(1)} öre`);
  }
  
  return parts.join(' + ');
}

/**
 * Get Swedish electricity provider net fees (öre/kWh)
 */
export function getProviderNetFees(): Record<string, number> {
  return {
    'vattenfall': 0.25,      // Vattenfall
    'e.on': 0.28,            // E.ON
    'fortum': 0.30,          // Fortum
    'tibber': 0.32,          // Tibber
    'ellakraft': 0.26,       // Elakraft
    'göteborg_energi': 0.29, // Göteborg Energi
    'stockholm_exergi': 0.31, // Stockholm Exergi
    'default': 0.30          // Default/Swedish average
  };
}
