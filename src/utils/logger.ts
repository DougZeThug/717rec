
export const log = (...args: unknown[]) =>
  process.env.NODE_ENV === "development" && console.log("[717REC]", ...args);

export const bracketLog = (...args: unknown[]) =>
  log("🎲 Bracket:", ...args);

export const teamLog = (...args: unknown[]) =>
  log("👥 Team:", ...args);

export const challongeLog = (...args: unknown[]) =>
  log("🏆 Challonge:", ...args);

export const matchLog = (...args: unknown[]) =>
  log("⚽ Match:", ...args);

export const errorLog = (...args: unknown[]) =>
  process.env.NODE_ENV === "development" && console.error("[717REC ERROR]", ...args);

// Progress logging for long operations
export const progressLog = (step: number, total: number, message: string, details?: string) => {
  log(`📊 Progress ${step}/${total}: ${message}`);
  if (details) log(`   ${details}`);
};

// Success/failure logging
export const successLog = (operation: string, details?: string) => {
  log(`✅ ${operation} completed successfully`);
  if (details) log(`   ${details}`);
};

export const failureLog = (operation: string, error: string | Error) => {
  errorLog(`❌ ${operation} failed:`, error);
};

// Supabase-specific error logging
export const supabaseErrorLog = (operation: string, error: any) => {
  if (error && typeof error === 'object' && 'code' in error) {
    errorLog(`🔴 Supabase Error in ${operation}:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      statusCode: error.statusCode
    });
  } else {
    errorLog(`❌ ${operation} error:`, error);
  }
};
