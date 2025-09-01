import { addProvider } from '@/features/wallet/wallet-slice';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

export const useEIP6963Providers = () => {
  const dispatch = useDispatch();

  useEffect(
    function setupProviderEventListener() {
      const handleAnnouncement = (event) => {
        dispatch(addProvider(event.detail));
      };

      // Listen for provider announcements
      window.addEventListener('eip6963:announceProvider', handleAnnouncement);

      // Request providers to announce themselves
      window.dispatchEvent(new Event('eip6963:requestProvider'));

      return () => {
        window.removeEventListener(
          'eip6963:announceProvider',
          handleAnnouncement,
        );
      };
    },
    [dispatch],
  );
};
