import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-[oklch(0.68_0.18_75/0.15)] rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-[oklch(0.76_0.15_75/0.1)] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-[oklch(0.58_0.16_75/0.08)] rounded-full blur-[60px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="animate-slide-in-left">
            {/* Logo */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.76_0.15_75)] to-[oklch(0.58_0.16_75)] flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="font-display text-5xl xl:text-6xl font-bold tracking-tight">
                OrderFlow
              </h1>
              <p className="text-[oklch(0.84_0.12_75)] text-lg mt-2 font-body tracking-wide">
                Hotel Restaurant System
              </p>
            </div>

            {/* Tagline */}
            <div className="max-w-md animate-fade-in animation-delay-200">
              <p className="text-2xl xl:text-3xl font-display font-medium text-gray-200 leading-relaxed">
                Streamline your restaurant operations with our modern ordering platform.
              </p>
            </div>

            {/* Features list */}
            <ul className="mt-12 space-y-5 font-body text-gray-400">
              {[
                { text: 'Real-time kitchen display', delay: '300' },
                { text: 'Seamless payment processing', delay: '400' },
                { text: 'Smart menu management', delay: '500' },
              ].map((feature) => (
                <li
                  key={feature.text}
                  className={cn(
                    'flex items-center gap-4 animate-fade-in-up',
                    `animation-delay-${feature.delay}`
                  )}
                >
                  <div className="w-2 h-2 bg-[oklch(0.76_0.15_75)] rounded-full shrink-0" />
                  <span className="text-base">{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-12 xl:left-20 animate-fade-in animation-delay-600">
            <p className="text-sm text-gray-500 font-body">
              &copy; {new Date().getFullYear()} OrderFlow. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.76_0.15_75)] to-[oklch(0.58_0.16_75)] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900">OrderFlow</h1>
          </div>

          {/* Form header */}
          <div className="mb-10 animate-fade-in-up">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {title}
            </h2>
            <p className="mt-3 text-gray-500 font-body text-base">{subtitle}</p>
          </div>

          {/* Form content */}
          <div className="animate-fade-in-up animation-delay-200">{children}</div>
        </div>
      </div>
    </div>
  );
}
