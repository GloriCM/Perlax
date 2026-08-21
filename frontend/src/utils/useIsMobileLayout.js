import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 992;

function detectMobileLayout() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

export function useIsMobileLayout() {
    const [isMobile, setIsMobile] = useState(detectMobileLayout);
    useEffect(() => {
        const sync = () => setIsMobile(detectMobileLayout());
        sync();
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
        };
    }, []);
    return isMobile;
}

export const MOBILE_LAYOUT_MAX_WIDTH = MOBILE_BREAKPOINT;