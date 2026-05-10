import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const CertificationSelectionContext = createContext(null);
const STORAGE_KEY = 'quickcheck.selectedCertification';

export function CertificationSelectionProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user?.id || user?._id ? `${STORAGE_KEY}.${user.id || user._id}` : STORAGE_KEY;
  const [selectedCertification, setSelectedCertification] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (selectedCertification) {
      localStorage.setItem(storageKey, JSON.stringify(selectedCertification));
      return;
    }
    localStorage.removeItem(storageKey);
  }, [selectedCertification, storageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setSelectedCertification(stored ? JSON.parse(stored) : null);
  }, [storageKey]);

  const selectCertification = (certification) => setSelectedCertification(certification);
  const clearCertification = () => setSelectedCertification(null);

  const value = useMemo(
    () => ({ selectedCertification, selectCertification, clearCertification }),
    [selectedCertification]
  );

  return <CertificationSelectionContext.Provider value={value}>{children}</CertificationSelectionContext.Provider>;
}

export const useCertificationSelection = () => useContext(CertificationSelectionContext);

