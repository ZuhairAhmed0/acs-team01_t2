import { SignUp, useAuth } from '@clerk/react';
import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Button } from '../../../components/ui/Button.js';
import {
  FuelIcon,
  GlobeIcon,
} from '../../../components/ui/Icons.js';

export function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { t, toggleLang } = useLanguage();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg text-content-primary">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl wallet-hero-gradient text-white shadow-sm">
            <FuelIcon size={20} />
          </div>
          <div>
            <span className="block text-base font-extrabold">{t.appName}</span>
            <span className="block text-xs text-content-secondary">
              {t.appTagline}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            leftIcon={<GlobeIcon size={15} />}
          >
            {t.lang.toggle}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex flex-1 flex-col items-center justify-center px-4 py-8">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
        <p className="mt-6 text-xs text-content-muted">
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="font-semibold text-brand-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
