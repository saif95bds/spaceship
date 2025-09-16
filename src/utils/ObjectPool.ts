/**
 * Generic object pool implementation for performance optimization
 * Reduces garbage collection by reusing objects instead of creating new ones
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    
    // Pre-populate pool with initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Get an object from the pool, or create a new one if pool is empty
   */
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      return obj;
    } else {
      // Pool is empty, create new object
      return this.createFn();
    }
  }

  /**
   * Return an object to the pool for reuse
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
    // If pool is full, let the object be garbage collected
  }

  /**
   * Get current pool statistics for debugging
   */
  getStats(): { available: number; maxSize: number } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
  }
}