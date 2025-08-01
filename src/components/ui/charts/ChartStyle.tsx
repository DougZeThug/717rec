
import * as React from "react";
import { ChartConfig } from "./ChartContainer";

const THEMES = { light: "", dark: ".dark" } as const;

// SECURITY: Sanitize CSS values to prevent injection attacks
const sanitizeCSSValue = (value: string): string => {
  if (typeof value !== 'string') return '';
  
  // Remove any potentially dangerous characters
  return value
    .replace(/[<>'"]/g, '') // Remove HTML/script chars
    .replace(/\/\*|\*\//g, '') // Remove CSS comments
    .replace(/;|\}/g, '') // Remove CSS terminators
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .trim();
};

// SECURITY: Sanitize CSS property names to only allow safe chart color variables
const sanitizeCSSProperty = (property: string): string => {
  if (typeof property !== 'string') return '';
  
  // Only allow alphanumeric characters, hyphens, and underscores for CSS custom properties
  const sanitized = property.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Ensure it starts with a letter and is a reasonable length
  if (!/^[a-zA-Z]/.test(sanitized) || sanitized.length > 50) {
    return '';
  }
  
  return sanitized;
};

export const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.theme || config.color
  );

  if (!colorConfig.length) {
    return null;
  }

  // SECURITY: Sanitize the chart ID to prevent CSS injection
  const sanitizedId = sanitizeCSSValue(id);
  if (!sanitizedId) {
    console.warn('ChartStyle: Invalid chart ID provided');
    return null;
  }

  const styles = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const cssRules = colorConfig
        .map(([key, itemConfig]) => {
          const sanitizedKey = sanitizeCSSProperty(key);
          if (!sanitizedKey) return null;
          
          const color =
            itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
            itemConfig.color;
          
          if (!color) return null;
          
          const sanitizedColor = sanitizeCSSValue(color);
          if (!sanitizedColor) return null;
          
          return `  --color-${sanitizedKey}: ${sanitizedColor};`;
        })
        .filter(Boolean)
        .join('\n');

      if (!cssRules) return '';
      
      return `${prefix} [data-chart="${sanitizedId}"] {\n${cssRules}\n}`;
    })
    .filter(Boolean)
    .join('\n');

  // SECURITY: Create style element using React.createElement instead of dangerouslySetInnerHTML
  return React.createElement('style', {
    key: `chart-style-${sanitizedId}`,
    children: styles
  });
};
