import { loadPricingContext } from '../../v2/data/pricing'

export type ProductRegion = 'ir' | 'intl'

export interface SignupRegion {
  countryCode: string | null
  productRegion: ProductRegion
  source: 'ip_at_signup'
}

export async function resolveSignupRegion(fallbackLocale: 'fa' | 'en'): Promise<SignupRegion> {
  try {
    const context = await loadPricingContext()
    if (context?.suggested_product_region === 'ir' || context?.suggested_product_region === 'intl') {
      return {
        countryCode: context.country,
        productRegion: context.suggested_product_region,
        source: 'ip_at_signup',
      }
    }
    if (context) {
      return {
        countryCode: context.country,
        productRegion: context.suggested_market === 'ir' ? 'ir' : 'intl',
        source: 'ip_at_signup',
      }
    }
  } catch {
    // Geo is a one-time hint. Signup still proceeds with a locale fallback.
  }

  return {
    countryCode: null,
    productRegion: fallbackLocale === 'fa' ? 'ir' : 'intl',
    source: 'ip_at_signup',
  }
}
