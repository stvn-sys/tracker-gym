import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * A tiny "something changed" signal. Cards reload when `version` changes, so
 * logging food in one card updates the summary card next to it.
 */
const Ctx = createContext<{ version: number; bump: () => void }>({ version: 0, bump: () => {} });

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  return <Ctx.Provider value={{ version, bump }}>{children}</Ctx.Provider>;
}

export const useDataVersion = () => useContext(Ctx);
