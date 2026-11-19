import { useClerk } from '@clerk/react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../app/providers/LanguageProvider.js';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import {
  FuelIcon,
  GlobeIcon,
  LogOutIcon,
  UserIcon,
} from '../ui/Icons.js';

export function TopNavbar() {
  const { t, toggleLang } = useLanguage();
  const { user } = useCurrentUser();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-surface-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl wallet-hero-gradient text-white shadow-sm">
            <FuelIcon size={20} />
          </div>
          <div>
            <span className="block text-base font-extrabold tracking-tight text-content-primary">
              {t.appName}
            </span>
            <span className="hidden text-xs text-content-secondary sm:block">
              {t.appTagline}
            </span>
          </div>
        </Link>

        {/* Controls: Role Badge, Account Status, Language, Profile & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden items-center gap-2 md:flex">
              <Badge
                tone={
                  user.role === 'ADMIN'
                    ? 'purple'
                    : user.role === 'OPERATOR'
                      ? 'info'
                      : 'neutral'
                }
              >
                {t.roles[user.role]}
              </Badge>
              <Badge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                {t.accountStatus[user.status]}
              </Badge>
            </div>
          )}

          {/* Language Switcher (AR RTL <-> EN LTR) */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            leftIcon={<GlobeIcon size={15} />}
            aria-label="Switch Language"
          >
            {t.lang.toggle}
          </Button>

          {user && (
            <>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-content-primary hover:border-brand-primary/50"
              >
                <UserIcon size={15} />
                <span className="hidden sm:inline">
                  {user.fullName || t.nav.profile}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                title={t.nav.signOut}
                aria-label={t.nav.signOut}
              >
                <LogOutIcon size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Frozen Account Warning Banner */}
      {user?.status === 'FROZEN' && (
        <div className="border-t border-red-500/30 bg-red-500/15 px-4 py-2 text-center text-xs font-semibold text-red-500">
          {t.accountStatus.frozenBanner}
        </div>
      )}
    </header>
  );
}
