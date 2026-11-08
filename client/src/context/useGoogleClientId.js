import { useEffect, useState } from 'react';
import { API_BASE } from '../services/config';

export default function useGoogleClientId() {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/users/google/config`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && typeof data?.clientId === 'string') {
          setClientId(data.clientId);
        }
      })
      .catch(() => {
        // Password sign-in remains usable if Google or the server is unavailable.
      });
    return () => controller.abort();
  }, []);

  return clientId;
}
