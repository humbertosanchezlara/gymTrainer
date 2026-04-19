import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import OnboardingWizard from './components/OnboardingWizard';
import MainShell from './components/MainShell';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import { useTheme } from './hooks/useTheme';

function AppRouter() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      if (event === 'USER_UPDATED') {
        setIsRecovery(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      setHasProfile(null);
      return;
    }

    supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasProfile(!!data);
        setCheckingProfile(false);
      });
  }, [user]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (isRecovery) {
    return <ResetPasswordScreen onSuccess={() => setIsRecovery(false)} />;
  }

  if (!user) return <AuthScreen />;

  if (!hasProfile) {
    return (
      <OnboardingWizard
        onComplete={() => setHasProfile(true)}
      />
    );
  }

  return <MainShell theme={theme} toggleTheme={toggleTheme} />;
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
