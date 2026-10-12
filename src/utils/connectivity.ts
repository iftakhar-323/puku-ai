import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type ConnectivityListener = (isOnline: boolean) => void;

let mockOnline: boolean | null = null;

export function setMockConnectivity(online: boolean | null): void {
  mockOnline = online;
}

export async function isOnline(): Promise<boolean> {
  if (mockOnline !== null) {
    return mockOnline;
  }
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}

export function addConnectivityListener(listener: ConnectivityListener): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (mockOnline !== null) {
      listener(mockOnline);
    } else {
      listener(Boolean(state.isConnected && state.isInternetReachable !== false));
    }
  });

  return unsubscribe;
}

