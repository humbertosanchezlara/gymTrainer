import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { supabase } from './lib/supabase';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import OnboardingWizard from './components/OnboardingWizard';
import MainShell from './components/MainShell';
import ResetPasswordScreen from './components/ResetPasswordScreen';

function profileCacheKey(userId: string) {
  return `profile_exists_${userId}`;
}

function readCachedProfile(userId?: string): boolean | null {
  if (!userId || typeof window === 'undefined') return null;
  return localStorage.getItem(profileCacheKey(userId)) === 'true' ? true : null;
}

function AppRouter() {
  const { user, loading } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'USER_UPDATED') setIsRecovery(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      setHasProfile(null);
      return;
    }
    let cancelled = false;
    const cachedProfile = readCachedProfile(user.id);
    setShowAuth(false);
    setCheckingProfile(cachedProfile !== true);
    setHasProfile(cachedProfile);
    supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (cancelled) return;
          const profileExists = !!data;
          setHasProfile(profileExists);
          if (profileExists) {
            localStorage.setItem(profileCacheKey(user.id), 'true');
          } else {
            localStorage.removeItem(profileCacheKey(user.id));
          }
          setCheckingProfile(false);
        },
        () => {
          if (cancelled) return;
          setHasProfile(true);
          setCheckingProfile(false);
        }
      );
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || checkingProfile || (user && hasProfile === null)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--rule)', borderTopColor: 'var(--ink)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isRecovery) {
    return <ResetPasswordScreen onSuccess={() => setIsRecovery(false)} />;
  }

  if (!user) {
    if (showAuth) {
      return (
        <AuthScreen
          initialMode={authMode}
          onBack={() => setShowAuth(false)}
        />
      );
    }
    return (
      <LandingPage
        onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
        onSignup={() => { setAuthMode('signup'); setShowAuth(true); }}
      />
    );
  }

  if (hasProfile === false) {
    return (
      <OnboardingWizard
        onComplete={() => {
          localStorage.setItem(profileCacheKey(user.id), 'true');
          setHasProfile(true);
        }}
      />
    );
  }

  if (showRegenerate) {
    return <OnboardingWizard regenerateMode onComplete={() => setShowRegenerate(false)} />;
  }

  return <MainShell onProgramDeleted={() => setShowRegenerate(true)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
