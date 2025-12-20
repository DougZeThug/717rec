
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'

// CRITICAL: Correct order - Tailwind first, then library, then theme
import './index.css' // Tailwind base + components + utilities
import 'brackets-viewer/dist/brackets-viewer.min.css' // Library rules
import './styles/brackets-viewer-717rec-theme.css' // Theme tweaks last

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="system" 
    themes={['light', 'dark', 'system', 'winter-frozen']}
    enableSystem={true} 
    disableTransitionOnChange={false}
  >
    <App />
  </ThemeProvider>
);
