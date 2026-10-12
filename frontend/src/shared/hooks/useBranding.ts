import React, { useEffect } from 'react';
import { useQuery, QueryClient, QueryClientContext } from '@tanstack/react-query';
import { axiosClient } from '../api/axiosClient';

export interface PublicBrandingData {
  company_name: string;
  legal_name?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  support_email?: string | null;
  website?: string | null;
}

const fallbackClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export const useBranding = () => {
  const contextClient = React.useContext(QueryClientContext);
  const activeClient = contextClient || fallbackClient;

  const { data, isLoading, error } = useQuery<PublicBrandingData>(
    {
      queryKey: ['public-branding'],
      queryFn: async () => {
        const res = await axiosClient.get('/public/branding');
        return res.data.data;
      },
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
    activeClient
  );

  const envAppName = import.meta.env.VITE_APP_NAME || 'Qynova ERP';
  const appName = data?.company_name || envAppName;
  const isConfigured = Boolean(data?.company_name && data.company_name.trim().length > 0);

  useEffect(() => {
    if (appName) {
      document.title = appName;
    }

    if (data?.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.favicon_url;
    }
  }, [appName, data?.favicon_url]);

  return {
    branding: data,
    appName,
    logoUrl: data?.logo_url || null,
    faviconUrl: data?.favicon_url || null,
    tagline: data?.tagline || 'Run your people, time and payroll in one place.',
    supportEmail: data?.support_email || import.meta.env.VITE_SUPPORT_EMAIL || 'support@qynova.com',
    legalName: data?.legal_name || null,
    website: data?.website || null,
    isConfigured,
    isLoading,
    error,
  };
};
