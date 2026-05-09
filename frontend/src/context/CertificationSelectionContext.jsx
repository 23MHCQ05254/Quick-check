import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CertificationSelectionContext = createContext(null);
const STORAGE_KEY = 'quickcheck.selectedCertification';

export function CertificationSelectionProvider({ children }) {
  const [selectedCertification, setSelectedCertification] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (selectedCertification) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCertification));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [selectedCertification]);

  const selectCertification = (certification) => setSelectedCertification(certification);
  const clearCertification = () => setSelectedCertification(null);

  const value = useMemo(
    () => ({ selectedCertification, selectCertification, clearCertification }),
    [selectedCertification]
  );

  return <CertificationSelectionContext.Provider value={value}>{children}</CertificationSelectionContext.Provider>;
}

export const useCertificationSelection = () => useContext(CertificationSelectionContext);

