export interface ProductConfig {
  id: string;
  name: string;
  tagline: string;
  parentBrand: string;
  version: string;
  features: FeatureFlags;
}

export interface FeatureFlags {
  fhirExport: boolean;
  providerSharing: boolean;
  multiDevice: boolean;
}

const APP_CONFIG: ProductConfig = {
  id: 'myrecordsmyhealth',
  name: 'MyRecordsMyHealth',
  tagline: 'Your body. Your records. Your health.',
  parentBrand: 'MyBodyIsMyHealth.com',
  version: '1.0.0',
  features: {
    fhirExport: false,
    providerSharing: false,
    multiDevice: false,
  },
};

export default APP_CONFIG;

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return APP_CONFIG.features[feature];
}

