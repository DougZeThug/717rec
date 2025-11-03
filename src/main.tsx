
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'

// CRITICAL: Load brackets-viewer base CSS FIRST (before any app styles)
import 'brackets-viewer/dist/brackets-viewer.min.css'

// Then load app CSS (which includes theme overrides)
import './index.css'

createRoot(document.getElementById("root")!).render(
  <ThemeProvider 
    attribute="class" 
    defaultTheme="system" 
    enableSystem={true} 
    disableTransitionOnChange={false}
  >
    <App />
  </ThemeProvider>
);
