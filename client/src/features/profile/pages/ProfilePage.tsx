import { useClerk, useUser } from '@clerk/react';
import { useState } from 'react';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  CopyIcon,
  GlobeIcon,
  LogOutIcon,
  UserIcon,
} from '../../../components/ui/Icons.js';
import { formatWalletNumber } from '../../../lib/format.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';

export function ProfilePage() {
  const { t, lang, toggleLang } = useLanguage();
  const { user: dbUser, wallets } = useCurrentUser();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const mainWalletNumber = wallets
    ? formatWalletNumber(wallets.main.id, wallets.main.walletNumber)
    : '';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
          {t.nav.profile}
        </h1>
      </div>

      {/* User Identity Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl wallet-hero-gradient text-white">
            <UserIcon size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-content-primary">
              {dbUser?.fullName || clerkUser?.fullName || 'Fuel Wallet User'}
            </h2>
            <p className="text-xs text-content-secondary">
              {clerkUser?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
            {dbUser && (
              <div className="mt-1.5 flex items-center gap-2">
                <Badge tone="info">{t.roles[dbUser.role]}</Badge>
                <Badge tone={dbUser.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {t.accountStatus[dbUser.status]}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {dbUser && (
          <div className="space-y-2.5 rounded-xl border border-surface-border bg-surface-elevated p-4 text-xs">
            {wallets && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-surface-border">
                <span className="font-semibold text-content-secondary">
                  {lang === 'ar'
                    ? 'رقم المحفظة الرئيسية (Main Wallet ID):'
                    : 'Main Wallet ID:'}
                </span>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-brand-primary/10 px-2.5 py-1 font-mono text-sm font-extrabold text-brand-primary">
                    #{mainWalletNumber}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopy('wallet', mainWalletNumber)}
                    leftIcon={<CopyIcon size={13} />}
                  >
                    {copiedKey === 'wallet' ? t.common.copied : t.common.copy}
                  </Button>
                </div>
              </div>
            )}

            {/* <div className="flex items-center justify-between gap-2">
              <span className="text-content-secondary">
                Database User ID:
              </span>
              <div className="flex items-center gap-2">
                <code className="font-mono font-bold text-content-primary">
                  {dbUser.id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopy('user', dbUser.id)}
                  leftIcon={<CopyIcon size={13} />}
                >
                  {copiedKey === 'user' ? t.common.copied : t.common.copy}
                </Button>
              </div>
            </div> */}

            {/* {clerkUser && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-content-secondary">Clerk User ID:</span>
                <code className="font-mono text-content-primary">
                  {clerkUser.id}
                </code>
              </div>
            )} */}
          </div>
        )}
      </Card>

      {/* Preferences Card: Language */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-content-primary">
          {lang === 'ar'
            ? 'تفضيلات اللغة'
            : 'Language Preferences'}
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-content-primary">
              Language / اللغة
            </p>
            <p className="text-xs text-content-secondary">
              {lang === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            leftIcon={<GlobeIcon size={16} />}
          >
            {t.lang.toggle}
          </Button>
        </div>
      </Card>

      <Card>
        <Button
          variant="danger"
          fullWidth
          onClick={() => void signOut()}
          leftIcon={<LogOutIcon size={17} />}
        >
          {t.nav.signOut}
        </Button>
      </Card>
    </div>
  );
}
