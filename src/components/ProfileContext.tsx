import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { DEFAULT_PROFILE, loadProfile, saveSetting, type Profile } from '../repo/settings';

interface Ctx {
  profile: Profile;
  update: <K extends keyof Profile>(key: K, value: Profile[K]) => Promise<void>;
}

const ProfileContext = createContext<Ctx>({ profile: DEFAULT_PROFILE, update: async () => {} });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    loadProfile(db).then(setProfile);
  }, [db]);

  const update = useCallback<Ctx['update']>(async (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    await saveSetting(db, key, value as string | number | null);
  }, [db]);

  return <ProfileContext.Provider value={{ profile, update }}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
