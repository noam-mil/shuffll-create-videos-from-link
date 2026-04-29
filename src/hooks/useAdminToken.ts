import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminTokenState {
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

export const useAdminToken = (metaOrgId: string | null) => {
  const [state, setState] = useState<AdminTokenState>({
    token: null,
    expiresAt: null,
    isLoading: false,
    error: null,
  });
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchToken = useCallback(async () => {
    if (!metaOrgId) {
      setState({
        token: null,
        expiresAt: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setState({
          token: null,
          expiresAt: null,
          isLoading: false,
          error: 'Not authenticated',
        });
        return;
      }

      const response = await supabase.functions.invoke('get-admin-token', {
        body: { metaOrgId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get admin token');
      }

      const { token, expiresAt } = response.data;

      setState({
        token,
        expiresAt,
        isLoading: false,
        error: null,
      });

      // Schedule refresh 5 minutes before expiry
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      const refreshIn = expiresAt - Date.now() - 5 * 60 * 1000; // 5 min before expiry
      if (refreshIn > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          fetchToken();
        }, refreshIn);
      }

    } catch (error) {
      console.error('Error fetching admin token:', error);
      setState({
        token: null,
        expiresAt: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [metaOrgId]);

  useEffect(() => {
    fetchToken();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchToken]);

  const refresh = useCallback(() => {
    fetchToken();
  }, [fetchToken]);

  return {
    token: state.token,
    expiresAt: state.expiresAt,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};
