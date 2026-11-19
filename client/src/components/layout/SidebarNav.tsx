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
  UserIcon,
  WalletIcon,
} from '../ui/Icons.js';

export function SidebarNav() {
  const { t } = useLanguage();
  const { user } = useCurrentUser();

  const navItems = [
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
      to: '/stations',
      label: t.nav.stations,
      icon: <FuelIcon size={18} />,
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
    {
      to: '/profile',
      label: t.nav.profile,
      icon: <UserIcon size={18} />,
      show: true,
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav
        aria-label="Main Navigation"
        className="sticky top-22 space-y-1.5 rounded-2xl border border-surface-border bg-surface-card p-3 shadow-card"
      >
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/25'
                    : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}

