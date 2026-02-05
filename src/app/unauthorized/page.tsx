import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your account may be inactive or you don&apos;t have the required role to access this resource.
          </p>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/menu">Go to Menu</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/login">Login Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
