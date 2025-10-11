import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-secondary">
      <div className="text-center px-4">
        <h1 className="mb-4 text-8xl font-bold text-accent animate-in fade-in">404</h1>
        <p className="mb-6 text-2xl text-white/90">Oops! Page not found</p>
        <p className="mb-8 text-white/70 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/" 
          className="inline-flex items-center px-6 py-3 bg-accent hover:bg-accent-light text-foreground font-semibold rounded-lg shadow-elegant transition-all hover:scale-105"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
