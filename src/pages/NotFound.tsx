import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-extrabold font-heading text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
        <a href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
          ← Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
