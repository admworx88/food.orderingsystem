import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageSubHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  backHref: string;
}

export function PageSubHeader({ title, subtitle, backHref }: PageSubHeaderProps) {
  return (
    <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 lg:py-5 bg-white border-b border-stone-200">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href={backHref}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" strokeWidth={2} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-800">{title}</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
