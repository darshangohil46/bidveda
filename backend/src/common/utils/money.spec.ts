import { lineTotalMinor, sumMinor } from './money';

describe('money (integer minor units)', () => {
  it('multiplies quantity by unit price exactly', () => {
    expect(lineTotalMinor(100, 200_000)).toBe(20_000_000); // 100 chairs at 2,000
    expect(lineTotalMinor(2.5, 199_900)).toBe(499_750); // fractional quantity
  });

  it('rounds half-up on fractional results instead of leaking floats', () => {
    expect(lineTotalMinor(0.333, 100)).toBe(33);
    expect(lineTotalMinor(1.005, 1000)).toBe(1005);
  });

  it('adds line totals without float drift', () => {
    // the example from the brief: chairs 1,900 x 100 + desks 8,000 x 20 = 3,50,000
    const total = sumMinor([lineTotalMinor(100, 190_000), lineTotalMinor(20, 800_000)]);
    expect(total).toBe(35_000_000);
  });
});
