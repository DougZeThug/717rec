/**
 * Serializes bracket match updates to prevent race conditions
 * during concurrent update operations (e.g., multiple QF matches)
 */
class MatchUpdateQueue {
  private queue: Promise<void> = Promise.resolve();

  /**
   * Enqueue an update operation to be executed serially
   */
  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => operation());
    // Update queue regardless of success/failure to continue processing
    this.queue = result.then(() => {}, () => {});
    return result;
  }
}

export const matchUpdateQueue = new MatchUpdateQueue();
