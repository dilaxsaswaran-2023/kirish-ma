import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {
  ApiError,
  DEFAULT_BASE_URL,
  getBaseUrl,
  setBaseUrl,
  setToken,
} from '../api/client';
import {getMe, getSites, getWorkspaces, login, logout, selectWorkspace} from '../api/endpoints';
import type {Me, Site, Workspace} from '../api/types';

type SignInInput = {email: string; password: string};

type SessionValue = {
  signedIn: boolean;
  me: Me | undefined;
  workspaces: Workspace[];
  sites: Site[];
  /** Site the farmer is currently working in; every site-scoped screen reads it. */
  activeSite: Site | undefined;
  activeSiteId: string | undefined;
  baseUrl: string;
  connecting: boolean;
  error: ApiError | undefined;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => void;
  selectSite: (siteId: string) => void;
  selectCorporation: (corporationId: string) => Promise<void>;
  refreshSites: () => Promise<void>;
  /** True when the backend's role allows equipment commands (not VIEWER). */
  canControl: boolean;
  canManage: boolean;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({children}: {children: React.ReactNode}) {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | undefined>(undefined);
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  useEffect(() => {
    setBaseUrlState(getBaseUrl());
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    setConnecting(true);
    setError(undefined);
    setBaseUrl(DEFAULT_BASE_URL);
    setBaseUrlState(DEFAULT_BASE_URL);
    try {
      const session = await login(input.email, input.password);
      setToken(session.token);
      // A real round-trip proves the phone can reach the service before the
      // farmer is shown any equipment state.
      const [profile, spaces, siteRows] = await Promise.all([getMe(), getWorkspaces(), getSites()]);
      setMe(profile);
      setWorkspaces(spaces);
      setSites(siteRows);
      setActiveSiteId(siteRows[0]?.id);
    } catch (cause) {
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError(0, 'UNEXPECTED_ERROR', 'Sign-in could not be completed.');
      setError(failure);
      setToken(undefined);
      throw failure;
    } finally {
      setConnecting(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setMe(undefined);
    setWorkspaces([]);
    setSites([]);
    setActiveSiteId(undefined);
    setError(undefined);
    logout().catch(() => undefined);
    setToken(undefined);
  }, []);

  const refreshSites = useCallback(async () => {
    const rows = await getSites();
    setSites(rows);
    setActiveSiteId(current => (current && rows.some(s => s.id === current) ? current : rows[0]?.id));
  }, []);

  const selectCorporation = useCallback(async (corporationId: string) => {
    setConnecting(true);
    setError(undefined);
    try {
      await selectWorkspace(corporationId);
      const [profile, rows] = await Promise.all([getMe(), getSites()]);
      setMe(profile);
      setSites(rows);
      setActiveSiteId(rows[0]?.id);
    } catch (cause) {
      const failure = cause instanceof ApiError ? cause : new ApiError(0, 'UNEXPECTED_ERROR', 'Could not change corporation.');
      setError(failure);
      throw failure;
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo<SessionValue>(() => {
    const role = me?.role;
    return {
      signedIn: Boolean(me),
      me,
      workspaces,
      sites,
      activeSiteId,
      activeSite: sites.find(site => site.id === activeSiteId),
      baseUrl,
      connecting,
      error,
      signIn,
      signOut,
      selectSite: setActiveSiteId,
      selectCorporation,
      refreshSites,
      canControl: role !== undefined && role !== 'VIEWER',
      canManage: role === 'SUPER_ADMIN' || role === 'CORPORATE_ADMIN' || role === 'SITE_MANAGER',
    };
  }, [me, workspaces, sites, activeSiteId, baseUrl, connecting, error, signIn, signOut, refreshSites, selectCorporation]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
