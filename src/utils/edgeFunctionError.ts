import {
  AuthorizationError,
  BusinessLogicError,
  DatabaseError,
  ValidationError,
} from '@/types/errors';

import { getErrorMessage } from './errorHandler';
import { errorLog } from './logger';

/**
 * supabase.functions.invoke reports any non-2xx as a FunctionsHttpError whose
 * message is the fixed string "Edge Function returned a non-2xx status code".
 * The reason the function actually gave — "Too many requests. Please try again
 * later.", "Message contains too many links" — is only in the Response hanging
 * off `error.context`, and is lost unless it is read out.
 */
interface EdgeFunctionErrorContext {
  status?: number;
  clone?: () => { json: () => Promise<unknown>; text: () => Promise<string> };
}

/** Duck-typed so this module does not have to import the supabase client. */
function getResponseContext(error: unknown): EdgeFunctionErrorContext | null {
  if (typeof error !== 'object' || error === null || !('context' in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (typeof context !== 'object' || context === null) return null;
  if (typeof (context as { clone?: unknown }).clone !== 'function') return null;
  return context as EdgeFunctionErrorContext;
}

/**
 * Best-effort text for the log line. getErrorMessage only understands Error
 * instances and strings, but invoke can hand back a plain object.
 */
function describeRawFailure(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message.trim()) return message;
  }
  return getErrorMessage(error);
}

/** Pull the function's own message out of the response body, if it sent one. */
async function readReason(context: EdgeFunctionErrorContext): Promise<string | null> {
  if (!context.clone) return null;
  try {
    // The body can only be read once, so work on a copy.
    const body = await context.clone().json();
    if (typeof body === 'object' && body !== null) {
      const { error: bodyError, message } = body as { error?: unknown; message?: unknown };
      if (typeof bodyError === 'string' && bodyError.trim()) return bodyError;
      if (typeof message === 'string' && message.trim()) return message;
    }
  } catch {
    // Not JSON, or the body was already consumed — fall through to generic.
  }
  return null;
}

/**
 * Throw a typed error carrying the edge function's own message.
 *
 * The status decides the type, which is what lets getUIErrorMessage show the
 * message: a bare Error is treated as unvouched-for and stays generic.
 *
 * @throws always
 */
export async function throwEdgeFunctionError(error: unknown, context: string): Promise<never> {
  errorLog(`${context}:`, error);

  const response = getResponseContext(error);
  const reason = response ? await readReason(response) : null;
  const status = response?.status;

  if (reason) {
    if (status === 401 || status === 403) throw new AuthorizationError(reason);
    if (status === 429) throw new BusinessLogicError(reason);
    if (status !== undefined && status >= 400 && status < 500) throw new ValidationError(reason);
    throw new BusinessLogicError(reason);
  }

  // No readable body: keep the raw text for logging, but it stays generic in
  // the UI because DatabaseError is sanitised by getUIErrorMessage.
  throw new DatabaseError(`${context}: ${describeRawFailure(error)}`);
}
