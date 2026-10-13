import { CAPTURE_ASPECT, centerCrop } from '../normalizePortrait';

describe('centerCrop', () => {
  it('crops landscape webcam frames to a centred 4:5 portrait', () => {
    const crop = centerCrop(1920, 1080);
    expect(crop).toEqual({ x: 528, y: 0, width: 864, height: 1080 });
    expect(crop.width / crop.height).toBeCloseTo(CAPTURE_ASPECT, 2);
  });

  it('crops tall phone frames vertically', () => {
    const crop = centerCrop(1080, 1920);
    expect(crop).toEqual({ x: 0, y: 285, width: 1080, height: 1350 });
  });

  it('leaves frames that are already 4:5 untouched', () => {
    expect(centerCrop(1024, 1280)).toEqual({ x: 0, y: 0, width: 1024, height: 1280 });
  });
});
