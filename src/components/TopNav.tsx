import React from 'react';
import {
  Bell,
  CalendarCheck,
  Home,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import type { AppScreen, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface TopNavProps {
  currentScreen: AppScreen;
  activeRole: UserRole;
  isAdmin: boolean;
  unreadNotifications: number;
  isSignedIn: boolean;
  onNavigate: (screen: AppScreen) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentScreen,
  activeRole,
  isAdmin,
  unreadNotifications,
  isSignedIn,
  onNavigate,
}) => {
  const isProMode = activeRole === 'professional';

  const navLinks: { label: string; screen: AppScreen }[] = isProMode
    ? [
        { label: 'Dashboard', screen: 'pro-dashboard' },
        { label: 'Requests', screen: 'pro-requests' },
        { label: 'Earnings', screen: 'pro-earnings' },
        { label: 'Reviews', screen: 'reviews' },
      ]
    : [
        { label: 'Home', screen: 'customer-home' },
        { label: 'Services', screen: 'categories' },
        { label: 'Nearby Map', screen: 'nearby-map' },
        { label: 'Bookings', screen: 'my-bookings' },
      ];

  if (isAdmin) {
    navLinks.push({ label: 'Admin', screen: 'admin' });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Title */}
        <button
          type="button"
          onClick={() =>
            onNavigate(isProMode ? 'pro-dashboard' : 'customer-home')
          }
          className="text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg shrink-0"
          aria-label="AF FIXING Home"
        >
          <BrandLogo size="sm" />
        </button>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          aria-label="Primary navigation"
        >
          {navLinks.map((item) => {
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  active
                    ? 'text-[#0B1F3A] border-[#2563EB] font-semibold'
                    : 'border-transparent hover:text-[#0B1F3A] hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 px-1 min-w-[16px] h-4 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              onNavigate(
                isSignedIn
                  ? isProMode
                    ? 'pro-register'
                    : 'customer-profile'
                  : 'auth'
              )
            }
            className="px-4 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {isSignedIn ? (isProMode ? 'Pro Profile' : 'Account') : 'Sign In'}
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<{
  currentScreen: AppScreen;
  activeRole: UserRole;
  isAdmin: boolean;
  onNavigate: (screen: AppScreen) => void;
}> = ({ currentScreen, activeRole, isAdmin, onNavigate }) => {
  const isPro = activeRole === 'professional';

  const items = isPro
    ? [
        { label: 'Dashboard', screen: 'pro-dashboard' as AppScreen, icon: LayoutDashboard },
        { label: 'Requests', screen: 'pro-requests' as AppScreen, icon: CalendarCheck },
        { label: 'Earnings', screen: 'pro-earnings' as AppScreen, icon: Wallet },
        { label: 'Profile', screen: 'pro-register' as AppScreen, icon: User },
      ]
    : [
        { label: 'Home', screen: 'customer-home' as AppScreen, icon: Home },
        { label: 'Nearby', screen: 'nearby-map' as AppScreen, icon: MapPin },
        { label: 'Bookings', screen: 'my-bookings' as AppScreen, icon: CalendarCheck },
        ...(isAdmin
          ? [{ label: 'Admin', screen: 'admin' as AppScreen, icon: ShieldCheck }]
          : [{ label: 'Profile', screen: 'customer-profile' as AppScreen, icon: User }]),
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      aria-label="Mobile bottom navigation"
    >
      <div className="grid grid-cols-4 h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                active ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
