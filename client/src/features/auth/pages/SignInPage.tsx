import { SignIn, useAuth } from '@clerk/react';
import { Link, Navigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Button } from '../../../components/ui/Button.js';
import {
  FuelIcon,
  GlobeIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons.js';

export function SignInPage() {
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
        <div className="mb-6 text-center max-w-md">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
            <ShieldCheckIcon size={14} />
            <span>Double-Entry Protected Digital Fuel Wallet</span>
          </div>
          <h1 className="text-2xl font-extrabold text-content-primary sm:text-3xl">
            {t.appName}
          </h1>
          <p className="mt-1.5 text-sm text-content-secondary">
            {t.appTagline}
          </p>
        </div>

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />

        <p className="mt-6 text-xs text-content-muted">
          Don&apos;t have an account?{' '}
          <Link
            to="/sign-up"
            className="font-semibold text-brand-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
