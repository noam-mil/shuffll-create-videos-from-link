import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AccessDenied = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
