import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../app/providers/LanguageProvider.js';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser.js';
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  FuelIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '../ui/Icons.js';

/**
 * Mobile-First Bottom Tab Navigation.
 * Optimized for drivers at fuel stations using the app one-handed on smartphones.
 */
export function MobileBottomNav() {
  const { t } = useLanguage();
  const { user } = useCurrentUser();

  const items = [
    {
      to: '/',
      label: t.nav.dashboard,
      icon: <LayoutDashboardIcon size={18} />,
      show: true,
    },
    {
      to: '/wallets',
      label: t.nav.wallets,
      icon: <WalletIcon size={18} />,
      show: true,
    },
    {
      to: '/pay',
      label: t.nav.pay,
      icon: <ReceiptIcon size={18} />,
      show: true,
    },
    {
      to: '/transfer',
      label: t.nav.transfer,
      icon: <ArrowLeftRightIcon size={18} />,
      show: true,
    },
    {
      to: '/stations',
      label: t.nav.stations,
      icon: <FuelIcon size={18} />,
      show: true,
    },
    {
      to: '/transactions',
      label: t.nav.transactions,
      icon: <HistoryIcon size={18} />,
      show: true,
    },
    {
      to: '/operator',
      label: t.nav.operator,
      icon: <ActivityIcon size={18} />,
      show: user?.role === 'OPERATOR' || user?.role === 'ADMIN',
    },
    {
      to: '/admin',
      label: t.nav.admin,
      icon: <ShieldCheckIcon size={18} />,
      show: user?.role === 'ADMIN',
    },
  ];

  const visibleItems = items.filter((i) => i.show);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-surface-border bg-surface-card/95 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around overflow-x-auto px-2 py-1.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'text-brand-primary bg-brand-primary/10'
                  : 'text-content-secondary hover:text-content-primary'
              }`
            }
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

