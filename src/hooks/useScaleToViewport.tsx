import { useEffect, useState } from 'react';

/**
 * Returns a scale factor to fit a design width into the current viewport width.
 * scale = clamp(minScale, viewportWidth / designWidth, 1)
 */
export default function useScaleToViewport(designWidth = 1400, minScale = 0.35) {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    function update() {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      const s = Math.min(1, Math.max(minScale, w / designWidth));
      setScale(Number(s.toFixed(3)));
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [designWidth, minScale]);

  return scale;
}
