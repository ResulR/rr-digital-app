import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import type { CompanyAccess, MeResponse } from '../auth/authTypes';

interface CompanyContextValue {
  companies: CompanyAccess[];
  selectedCompany: CompanyAccess | null;
  isLoadingCompanies: boolean;
  companyError: string | null;
  refreshCompanies: () => Promise<void>;
  selectCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { authenticatedRequest, isAuthenticated, isRestoringSession } = useAuth();
  const [companies, setCompanies] = useState<CompanyAccess[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyAccess | null>(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Load companies from /auth/me
  const loadCompanies = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setCompanies([]);
      setSelectedCompany(null);
      setCompanyError(null);
      return;
    }

    setIsLoadingCompanies(true);
    setCompanyError(null);
    try {
      const me = await authenticatedRequest<MeResponse>('/auth/me');
      setCompanies(me.companies);

      // Keep the current selected company if it still exists and is active.
      // Otherwise fall back to the first active company.
      setSelectedCompany((current) => {
        const stillAvailable = current
          ? me.companies.find(
              (c) => c.id === current.id && c.status === 'active',
            ) ?? null
          : null;

        return (
          stillAvailable ??
          me.companies.find((c) => c.status === 'active') ??
          null
        );
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Impossible de charger les entreprises.';
      setCompanyError(message);
      setCompanies([]);
      setSelectedCompany(null);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [isAuthenticated, authenticatedRequest]);

  // Load companies on mount and when auth changes
  useEffect(() => {
    if (isRestoringSession) return; // Wait for session restore
    loadCompanies();
  }, [isAuthenticated, isRestoringSession, loadCompanies]);

  // Public refresh function
  const refreshCompanies = useCallback(async (): Promise<void> => {
    await loadCompanies();
  }, [loadCompanies]);

  // Select a company if it exists and is active
  const selectCompany = useCallback((companyId: string): void => {
    const company = companies.find(
      (c) => c.id === companyId && c.status === 'active',
    );
    if (company) {
      setSelectedCompany(company);
    }
  }, [companies]);

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      selectedCompany,
      isLoadingCompanies,
      companyError,
      refreshCompanies,
      selectCompany,
    }),
    [companies, selectedCompany, isLoadingCompanies, companyError, refreshCompanies, selectCompany],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany must be used inside <CompanyProvider>');
  }
  return ctx;
}
