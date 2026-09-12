import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {
  ApiError,
  DEFAULT_BASE_URL,
  DEMO_IDENTITY,
  getBaseUrl,
  setBaseUrl,
  setIdentity,
} from '../api/client';
import {getDevices, getMe, getSites, getWorkspaces} from '../api/endpoints';
import type {Me, Role, Site, Workspace} from '../api/types';

type SignInInput = {userId: string; corporationId: string; role: Role; baseUrl: string};

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
  refreshSites: () => Promise<void>;
  /** True when the backend's role allows equipment commands (not VIEWER). */
  canControl: boolean;
  canManage: boolean;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

/**
 * Open in a site the farmer can actually do something in: the first one with a
 * controller that has a motor or valve, preferring one that is online. Falls
 * back to the first site the service listed if that cannot be determined.
 */
async function pickOpeningSite(sites: Site[]): Promise<string | undefined> {
  if (sites.length <= 1) {
    return sites[0]?.id;
  }
  try {
    const perSite = await Promise.all(
      sites.map(async site => {
        const devices = await getDevices(site.id);
        const actuated = devices.filter(device => (device.actuator_count ?? 0) > 0);
        return {
          id: site.id,
          hasEquipment: actuated.length > 0,
          hasOnlineEquipment: actuated.some(device => device.status === 'ONLINE'),
        };
      }),
    );
    return (
      perSite.find(entry => entry.hasOnlineEquipment)?.id ??
      perSite.find(entry => entry.hasEquipment)?.id ??
      sites[0].id
    );
  } catch {
    return sites[0].id;
  }
}

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
    setBaseUrl(input.baseUrl);
    setBaseUrlState(input.baseUrl.replace(/\/+$/, ''));
    setIdentity({userId: input.userId, corporationId: input.corporationId, role: input.role});
    try {
      // A real round-trip proves the phone can reach the service before the
      // farmer is shown any equipment state.
      const [profile, spaces, siteRows] = await Promise.all([getMe(), getWorkspaces(), getSites()]);
      setMe(profile);
      setWorkspaces(spaces);
      setSites(siteRows);
      const opening = await pickOpeningSite(siteRows);
      setActiveSiteId(current => current ?? opening);
    } catch (cause) {
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError(0, 'UNEXPECTED_ERROR', 'Sign-in could not be completed.');
      setError(failure);
      setIdentity(DEMO_IDENTITY);
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
    setIdentity(DEMO_IDENTITY);
  }, []);

  const refreshSites = useCallback(async () => {
    const rows = await getSites();
    setSites(rows);
    setActiveSiteId(current => (current && rows.some(s => s.id === current) ? current : rows[0]?.id));
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
      refreshSites,
      canControl: role !== undefined && role !== 'VIEWER',
      canManage: role === 'SUPER_ADMIN' || role === 'CORPORATE_ADMIN' || role === 'SITE_MANAGER',
    };
  }, [me, workspaces, sites, activeSiteId, baseUrl, connecting, error, signIn, signOut, refreshSites]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
