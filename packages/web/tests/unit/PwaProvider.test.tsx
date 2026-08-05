import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

const { useRegisterSW } = vi.hoisted(() => ({
  useRegisterSW: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW }));

import { PwaProvider } from '~/states/PwaProvider';
import { usePwa } from '~/states/pwa';

function PwaStatus() {
  const { needRefresh } = usePwa();
  return <output>{needRefresh ? 'update available' : 'up to date'}</output>;
}

describe('PwaProvider', () => {
  beforeEach(() => {
    useRegisterSW.mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn().mockResolvedValue(undefined),
    });
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('owns one registration and shares its update state', () => {
    render(
      <PwaProvider>
        <PwaStatus />
      </PwaProvider>,
    );

    expect(useRegisterSW).toHaveBeenCalledTimes(1);
    expect(screen.getByText('update available')).toBeInTheDocument();
  });

  it('checks for an update when connectivity returns', async () => {
    render(
      <PwaProvider>
        <PwaStatus />
      </PwaProvider>,
    );

    const options = useRegisterSW.mock.calls[0]?.[0] as RegisterSWOptions;
    const update = vi.fn().mockResolvedValue(undefined);
    const registration = {
      installing: null,
      update,
    } as unknown as ServiceWorkerRegistration;

    act(() => options.onRegisteredSW?.('/sw.js', registration));
    fireEvent(window, new Event('online'));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });
});
