import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/benchmark/stats.js';

describe('Statistics', () => {
  it('should compute stats for simple array', () => {
    const stats = computeStats([1, 2, 3, 4, 5]);
    expect(stats.count).toBe(5);
    expect(stats.mean).toBe(3);
    expect(stats.median).toBe(3);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(5);
  });

  it('should compute median for even-length array', () => {
    const stats = computeStats([1, 2, 3, 4]);
    expect(stats.median).toBe(2.5);
  });

  it('should compute percentiles', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const stats = computeStats(values);
    expect(stats.p10).toBe(11); // 10th percentile of 1-100
    expect(stats.p90).toBe(91); // 90th percentile of 1-100
  });

  it('should compute stddev', () => {
    const stats = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stats.stddev).toBeCloseTo(2, 0);
  });

  it('should handle empty array', () => {
    const stats = computeStats([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
  });

  it('should handle single-element array', () => {
    const stats = computeStats([42]);
    expect(stats.count).toBe(1);
    expect(stats.mean).toBe(42);
    expect(stats.median).toBe(42);
    expect(stats.min).toBe(42);
    expect(stats.max).toBe(42);
    expect(stats.stddev).toBe(0);
  });
});
