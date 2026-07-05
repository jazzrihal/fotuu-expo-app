/**
 * Unit tests for useNetworkSync.
 * Verifies that runSync is called when a network reconnect event fires.
 *
 * Note: @testing-library/react-native v14 renderHook is async and must be awaited.
 */

jest.mock('@/lib/sync-manager', () => ({
  runSync: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

import { renderHook, act, cleanup } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { runSync } from '@/lib/sync-manager';
import { useNetworkSync } from '../useNetworkSync';

const mockRunSync = runSync as jest.Mock;
const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

type NetInfoCallback = (state: { isConnected: boolean | null }) => void;

/** Render the hook and return the NetInfo listener callback that was registered. */
async function mountHook(): Promise<{
  cb: NetInfoCallback | null;
  unsubscribeMock: jest.Mock;
  unmount: () => Promise<void>;
}> {
  let cb: NetInfoCallback | null = null;
  const unsubscribeMock = jest.fn();
  mockAddEventListener.mockImplementationOnce((callback: NetInfoCallback) => {
    cb = callback;
    return unsubscribeMock;
  });
  const { unmount } = await renderHook(() => useNetworkSync());
  return { cb, unsubscribeMock, unmount };
}

afterEach(async () => {
  await cleanup();
  mockRunSync.mockReset();
  mockAddEventListener.mockReset();
});

describe('useNetworkSync', () => {
  it('subscribes to NetInfo on mount and unsubscribes on unmount', async () => {
    const { unsubscribeMock, unmount } = await mountHook();

    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    await unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('calls runSync when network becomes connected', async () => {
    const { cb } = await mountHook();

    act(() => { cb?.({ isConnected: true }); });

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });

  it('does not call runSync when network is disconnected', async () => {
    const { cb } = await mountHook();

    act(() => { cb?.({ isConnected: false }); });

    expect(mockRunSync).not.toHaveBeenCalled();
  });

});

export {};
