import { useEffect, useRef, useState } from "react";

interface MarqueeProps {
  items: string[];
  speed?: number;
}

const Marquee = ({ items, speed = 50 }: MarqueeProps) => {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="relative overflow-hidden bg-primary py-3 border-y border-primary-light">
      <div
        ref={marqueeRef}
        className={`flex gap-8 whitespace-nowrap ${isPaused ? '' : 'animate-marquee'}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Duplicate items for seamless loop */}
        {[...items, ...items].map((item, index) => (
          <span
            key={index}
            className="text-white font-medium text-sm md:text-base inline-flex items-center gap-2"
          >
            <span className="inline-block w-2 h-2 bg-accent rounded-full" />
            {item}
          </span>
        ))}
      </div>
      
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-marquee {
          animation: marquee ${speed}s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Marquee;
