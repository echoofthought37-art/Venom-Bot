import { Link } from 'wouter';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Button asChild data-testid="button-home">
          <Link href="/">Return to Pairing Portal</Link>
        </Button>
      </div>
    </div>
  );
}
