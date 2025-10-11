import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const LoadingBar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Show loading bar when route changes
    setIsLoading(true);
    
    // Hide loading bar after animation completes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden">
      <div className="h-full w-full loading-gradient animate-loading-slide" />
    </div>
  );
};

export default LoadingBar;
