import { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings, saveSettings } from '../api/userSettings';

const KEY = 'fintrack_settings';

const DEFAULTS = {
  userName:      '',
  financialYear: 'calendar',
  palette:       'indigo',
  surface:       'frosted',
  density:       'balanced',
};

function toFrontend(row) {
  return {
    userName:      row.user_name      ?? DEFAULTS.userName,
    financialYear: row.financial_year ?? DEFAULTS.financialYear,
    palette:       row.palette        ?? DEFAULTS.palette,
    surface:       row.surface        ?? DEFAULTS.surface,
    density:       row.density        ?? DEFAULTS.density,
  };
}

function toBackend(s) {
  return {
    user_name:      s.userName,
    financial_year: s.financialYear,
    palette:        s.palette,
    surface:        s.surface,
    density:        s.density,
  };
}

function readLocalStorage() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export const SettingsCtx = createContext({ settings: DEFAULTS, updateSettings: () => {} });

export const useSettingsCtx = () => useContext(SettingsCtx);

export function SettingsProvider({ children }) {
  // Initialise from localStorage so there's no flash on first render
  const [settings, setState] = useState(readLocalStorage);

  // On mount: fetch from DB and override localStorage
  useEffect(() => {
    fetchSettings()
      .then((row) => {
        const next = toFrontend(row);
        setState(next);
        localStorage.setItem(KEY, JSON.stringify(next));
      })
      .catch(() => {}); // backend offline — keep localStorage values
  }, []);

  const updateSettings = (updates) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      // Write to localStorage immediately (instant, no round-trip)
      localStorage.setItem(KEY, JSON.stringify(next));
      // Persist to DB in the background
      saveSettings(toBackend(next)).catch(() => {});
      return next;
    });
  };

  return (
    <SettingsCtx.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsCtx.Provider>
  );
}
