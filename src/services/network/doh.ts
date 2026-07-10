export const DOH_PROVIDERS = [
  { id: 'disabled', name: 'Disabled' },
  { id: 'cloudflare', name: 'Cloudflare' },
  { id: 'google', name: 'Google' },
  { id: 'adguard', name: 'AdGuard' },
  { id: 'quad9', name: 'Quad9' },
  { id: 'alidns', name: 'AliDNS' },
  { id: 'dnspod', name: 'DNSPod' },
  { id: '360', name: '360' },
  { id: 'quad101', name: 'Quad 101' },
  { id: 'mullvad', name: 'Mullvad' },
  { id: 'controld', name: 'Control D' },
  { id: 'njalla', name: 'Njalla' },
  { id: 'shecan', name: 'Shecan' },
] as const;

export type DohProviderId = (typeof DOH_PROVIDERS)[number]['id'];

export const getDohProviderName = (providerId: DohProviderId) =>
  DOH_PROVIDERS.find(provider => provider.id === providerId)?.name ??
  DOH_PROVIDERS[0].name;
