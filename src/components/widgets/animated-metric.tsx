import React, { useEffect, useRef, useState } from 'react';
import { useInView, animate } from 'framer-motion';

interface AnimatedMetricProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export const AnimatedMetric: React.FC<AnimatedMetricProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1.2,
  decimals,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { amount: 0.3, once: false });

  let targetNumber = 0;
  let parsedPrefix = prefix;
  let parsedSuffix = suffix;
  let autoDecimals = 0;

  if (typeof value === 'number') {
    targetNumber = value;
    if (value % 1 !== 0) autoDecimals = 1;
  } else {
    // Extract non-numeric prefix, target number, and suffix if needed (e.g., "$79 USD", "₹5,000", "29.4%", "98%")
    const match = value.match(/^([^\d-]*)([\d,.]+)(.*)$/);
    if (match) {
      if (!prefix) parsedPrefix = match[1];
      const numStr = match[2].replace(/,/g, '');
      targetNumber = parseFloat(numStr) || 0;
      if (numStr.includes('.')) {
        autoDecimals = numStr.split('.')[1].length;
      }
      if (!suffix) parsedSuffix = match[3];
    } else {
      targetNumber = parseFloat(value) || 0;
    }
  }

  const numDecimals = decimals ?? autoDecimals;
  const initialText = `0${numDecimals > 0 ? '.' + '0'.repeat(numDecimals) : ''}`;
  const [displayValue, setDisplayValue] = useState<string>(initialText);

  useEffect(() => {
    if (!isInView) {
      setDisplayValue(initialText);
      return;
    }

    const controls = animate(0, targetNumber, {
      duration: duration,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (latest) => {
        if (numDecimals > 0) {
          setDisplayValue(latest.toFixed(numDecimals));
        } else {
          setDisplayValue(Math.round(latest).toLocaleString());
        }
      },
    });

    return () => controls.stop();
  }, [isInView, targetNumber, duration, numDecimals]);

  return (
    <span ref={ref} className={className}>
      {parsedPrefix}
      {displayValue}
      {parsedSuffix}
    </span>
  );
};
