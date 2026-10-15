'use client';

import React, { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import {
  ThemeProvider,
  useConnectivity,
  ErrorBoundaryFallback,
} from 'foodie-shared-web';
import { ConnectivityBanner } from '@/components/ConnectivityBanner';
import { store } from '@/store/store';
import { useAppDispatch } from '@/store/hooks';
import { setConnectivity } from '@/store/connectivitySlice';
import { runBootstrap } from '@/lib/bootstrap';

function ConnectivityBridge({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const connectivity = useConnectivity();

  useEffect(() => {
    dispatch(
      setConnectivity({
        isConnected: connectivity.isConnected,
      }),
    );
  }, [connectivity.isConnected, dispatch]);

  return <>{children}</>;
}

import { usePathname } from 'next/navigation';

function BootstrapGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';
  const dispatch = useAppDispatch();
  const [ready, setReady] = React.useState(isAuthPage);

  useEffect(() => {
    if (isAuthPage) {
      setReady(true);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        await runBootstrap(dispatch);
      } catch (err) {
        console.error('runBootstrap error:', err);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch, isAuthPage]);

  if (!ready && !isAuthPage) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

class RootErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          title="Something went wrong"
          onAction={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

import { PermissionProvider } from '@/context/PermissionContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootErrorBoundary>
      <Provider store={store}>
        <ThemeProvider initialMode="light" applyToDocument>
          <PermissionProvider>
            <ConnectivityBridge>
              <ConnectivityBanner />
              <BootstrapGate>{children}</BootstrapGate>
            </ConnectivityBridge>
          </PermissionProvider>
        </ThemeProvider>
      </Provider>
    </RootErrorBoundary>
  );
}
