import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'dark' | 'light';
}

export const AppIcon: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="64" height="64" rx="16" fill="#0B1F3A" />
    {/* Subtle home roofline */}
    <path
      d="M12 29L32 13L52 29"
      stroke="#2563EB"
      strokeWidth="4.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Monogram A + F */}
    <path
      d="M17.5 48L24.5 29.5H27.5L34.5 48M20 42.5H32"
      stroke="#FFFFFF"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M38.5 48V29.5H48.5M38.5 38.5H46.5"
      stroke="#60A5FA"
      strokeWidth="3.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Subtle wrench notch on roof */}
    <circle cx="49" cy="18" r="3" fill="#2563EB" />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  variant = 'dark',
}) => {
  const iconSize =
    size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const titleClass =
    size === 'lg'
      ? 'text-2xl font-extrabold tracking-tight'
      : size === 'sm'
      ? 'text-base font-extrabold tracking-tight'
      : 'text-lg font-extrabold tracking-tight';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <AppIcon className={iconSize} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-display whitespace-nowrap ${titleClass} ${
            variant === 'light' ? 'text-white' : 'text-[#0B1F3A]'
          }`}
        >
          AF FIXING
        </span>
        {showTagline && (
          <span
            className={`text-xs font-medium mt-1 whitespace-nowrap ${
              variant === 'light' ? 'text-blue-200' : 'text-slate-500'
            }`}
          >
            Find. Book. Fix.
          </span>
        )}
      </div>
    </div>
  );
};

export const SplashScreen: React.FC<{ onContinue: () => void }> = ({
  onContinue,
}) => {
  return (
    <div className="min-h-screen bg-[#0B1F3A] text-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="p-3 rounded-3xl bg-white/10 border border-white/15 mb-6 shadow-xl">
          <AppIcon className="w-20 h-20" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          AF FIXING
        </h1>
        <p className="mt-2 text-base font-medium text-blue-200">
          Find. Book. Fix.
        </p>
        <p className="mt-4 text-sm text-slate-300 leading-relaxed">
          Verified local technicians for AC, electrical, plumbing, and home
          appliance repair across India.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-8 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};
