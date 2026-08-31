export function productRegionFromCountry(country: string): 'ir' | 'intl' {
  return country.trim().toUpperCase() === 'IR' ? 'ir' : 'intl'
}
