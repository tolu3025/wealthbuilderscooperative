import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

const LoadingBar = () => {
  const navigation = useNavigation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === "loading") {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [navigation.state]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden">
      <div className="h-full w-full loading-gradient animate-loading-slide" />
    </div>
  );
};

export default LoadingBar;
