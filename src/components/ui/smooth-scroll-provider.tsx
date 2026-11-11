"use client";

import { ReactNode, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only initialize Lenis for the landing page
    // The board page shouldn't have smooth scrolling intercepting native canvas interactions
    if (pathname !== "/") return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenis.on("scroll", ScrollTrigger.update);

    // Sync GSAP ticker with Lenis
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0, 0);

    // Scroll progress bar logic
    if (progressRef.current) {
      lenis.on("scroll", ({ progress }: { progress: number }) => {
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress})`;
        }
      });
    }

    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
    };
  }, [pathname]);

  return (
    <>
      {pathname === "/" && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none">
          <div 
            ref={progressRef} 
            className="h-full bg-blue-500 origin-left scale-x-0 transition-transform duration-75"
          />
        </div>
      )}
      {children}
    </>
  );
}
