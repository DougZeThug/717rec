
import React, { useEffect, useState } from "react";

const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = () => setHasError(true);
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
  }, []);

  if (hasError) return <>{fallback}</>;

  try {
    return <>{children}</>;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in ErrorBoundary:", error);
    return <>{fallback}</>;
  }
};

export default ErrorBoundary;
