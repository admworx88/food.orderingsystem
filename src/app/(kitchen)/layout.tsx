import Link from 'next/link';

export default function KitchenLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-amber-400">KDS</span>
              <span className="text-gray-400 ml-2 text-base font-medium">Kitchen Display</span>
            </h1>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/kitchen/orders"
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 text-sm font-semibold hover:bg-gray-600 transition-all"
            >
              Orders
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
