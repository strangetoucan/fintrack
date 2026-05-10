import { describe, it, expect } from 'vitest';
import { fmt, fmtK } from './format.js';

// ── fmt() ─────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  describe('crore formatting (≥ 1,00,00,000)', () => {
    it('formats 1 crore', () => {
      expect(fmt(1e7)).toBe('₹1.00Cr');
    });
    it('formats 2.5 crore', () => {
      expect(fmt(2.5e7)).toBe('₹2.50Cr');
    });
    it('formats 10 crore', () => {
      expect(fmt(1e8)).toBe('₹10.00Cr');
    });
  });

  describe('lakh formatting (≥ 1,00,000 and < 1,00,00,000)', () => {
    it('formats 1 lakh', () => {
      expect(fmt(1e5)).toBe('₹1.00L');
    });
    it('formats 2.75 lakh', () => {
      expect(fmt(275000)).toBe('₹2.75L');
    });
    it('formats 99.99 lakh', () => {
      expect(fmt(9999000)).toBe('₹99.99L');
    });
  });

  describe('Indian comma formatting (< 1,00,000)', () => {
    it('formats 3-digit number', () => {
      expect(fmt(500)).toBe('₹500');
    });
    it('formats 4-digit number', () => {
      expect(fmt(1500)).toBe('₹1,500');
    });
    it('formats 5-digit number', () => {
      expect(fmt(99999)).toBe('₹99,999');
    });
    it('formats exact boundary 99,999', () => {
      expect(fmt(99999)).toBe('₹99,999');
    });
    it('formats 0', () => {
      expect(fmt(0)).toBe('₹0');
    });
    it('formats single digit', () => {
      expect(fmt(7)).toBe('₹7');
    });
  });

  describe('negative numbers', () => {
    it('prefixes with -₹ for negative values', () => {
      expect(fmt(-1500)).toBe('-₹1,500');
    });
    it('formats negative lakh', () => {
      expect(fmt(-150000)).toBe('-₹1.50L');
    });
  });
});

// ── fmtK() ────────────────────────────────────────────────────────────────────

describe('fmtK', () => {
  describe('lakh formatting (≥ 1,00,000)', () => {
    it('formats 1 lakh', () => {
      expect(fmtK(100000)).toBe('₹1.0L');
    });
    it('formats 2.5 lakh', () => {
      expect(fmtK(250000)).toBe('₹2.5L');
    });
  });

  describe('K formatting (≥ 1000 and < 1,00,000)', () => {
    it('formats 1000 as 1K', () => {
      expect(fmtK(1000)).toBe('₹1K');
    });
    it('formats 15000 as 15K', () => {
      expect(fmtK(15000)).toBe('₹15K');
    });
    it('formats 99000 as 99K', () => {
      expect(fmtK(99000)).toBe('₹99K');
    });
  });

  describe('plain formatting (< 1000)', () => {
    it('formats 0', () => {
      expect(fmtK(0)).toBe('₹0');
    });
    it('formats small amount', () => {
      expect(fmtK(500)).toBe('₹500');
    });
    it('formats 999', () => {
      expect(fmtK(999)).toBe('₹999');
    });
  });
});
