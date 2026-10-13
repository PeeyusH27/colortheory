import {
  contrastRatio,
  deltaE2000,
  hexToLab,
  hexToRgb,
  isHexColor,
  labToHex,
  mixHex,
  normalizeHex,
  readableOn,
  rgbToHex,
  shiftLightness,
} from '../color';

describe('hex parsing', () => {
  it('normalises short and long forms to #RRGGBB uppercase', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC');
    expect(normalizeHex('#172a46')).toBe('#172A46');
    expect(normalizeHex('  #FFF ')).toBe('#FFFFFF');
  });

  it('rejects invalid input', () => {
    expect(isHexColor('#12345')).toBe(false);
    expect(isHexColor('navy')).toBe(false);
    expect(() => normalizeHex('#GG0000')).toThrow('Invalid hex colour');
  });

  it('round-trips rgb ↔ hex', () => {
    expect(hexToRgb('#2E5B89')).toEqual({ r: 46, g: 91, b: 137 });
    expect(rgbToHex({ r: 46, g: 91, b: 137 })).toBe('#2E5B89');
    expect(rgbToHex({ r: 300, g: -4, b: 12.6 })).toBe('#FF000D'); // clamps and rounds
  });
});

describe('CIELAB conversion', () => {
  it('maps white and black to the ends of the lightness axis', () => {
    expect(hexToLab('#FFFFFF').L).toBeCloseTo(100, 1);
    expect(hexToLab('#000000').L).toBeCloseTo(0, 1);
  });

  it('round-trips through Lab within one unit per channel', () => {
    for (const hex of ['#172A46', '#FF6B4A', '#A7C7E7', '#0F4C5C', '#C19A6B']) {
      const back = hexToRgb(labToHex(hexToLab(hex)));
      const orig = hexToRgb(hex);
      expect(Math.abs(back.r - orig.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - orig.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - orig.b)).toBeLessThanOrEqual(1);
    }
  });
});

describe('deltaE2000', () => {
  // Reference pairs from Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula".
  it.each([
    [{ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ L: 50, a: 3.1571, b: -77.2803 }, { L: 50, a: 0, b: -82.7485 }, 2.8615],
    [{ L: 50, a: 2.5, b: 0 }, { L: 56, a: -27, b: -3 }, 31.903],
    [{ L: 60.2574, a: -34.0099, b: 36.2677 }, { L: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
  ])('matches published reference value %#', (a, b, expected) => {
    expect(deltaE2000(a, b)).toBeCloseTo(expected, 3);
  });

  it('is zero for identical colours and symmetric', () => {
    const a = hexToLab('#2E5B89');
    const b = hexToLab('#4682B4');
    expect(deltaE2000(a, a)).toBe(0);
    expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 10);
  });
});

describe('contrast and readability', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#172A46', '#F7F3EC')).toBeGreaterThan(12);
  });

  it('picks the more readable text colour', () => {
    expect(readableOn('#172A46')).toBe('#F7F3EC');
    expect(readableOn('#A7C7E7')).toBe('#172A46');
  });

  it('keeps the brand secondary text colour AA-compliant on cream', () => {
    expect(contrastRatio('#5E6774', '#F7F3EC')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('variants and mixing', () => {
  it('shifts lightness in the requested direction', () => {
    const base = hexToLab('#2E5B89').L;
    expect(hexToLab(shiftLightness('#2E5B89', 20)).L).toBeGreaterThan(base);
    expect(hexToLab(shiftLightness('#2E5B89', -20)).L).toBeLessThan(base);
  });

  it('mixes endpoints exactly at t=0 and t=1', () => {
    expect(mixHex('#172A46', '#F7F3EC', 0)).toBe('#172A46');
    expect(mixHex('#172A46', '#F7F3EC', 1)).toBe('#F7F3EC');
  });
});
