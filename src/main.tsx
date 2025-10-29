
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import './index.css'
import 'brackets-viewer/dist/brackets-viewer.min.css'

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
