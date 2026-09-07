import {
  shouldOpenWelcome,
  WELCOME_OPEN_PROGRESS,
} from './welcome';

describe('shouldOpenWelcome', () => {
  const travelDistance = 460;

  it('opens after a deliberate upward drag', () => {
    expect(shouldOpenWelcome(
      -(travelDistance * (WELCOME_OPEN_PROGRESS + 0.01)),
      0,
      travelDistance
    )).toBe(true);
  });

  it('opens after a quick upward flick', () => {
    expect(shouldOpenWelcome(-80, -1000, travelDistance)).toBe(true);
  });

  it('springs back after a short, slow drag', () => {
    expect(shouldOpenWelcome(-80, -120, travelDistance)).toBe(false);
  });

  it('does not open with invalid travel geometry', () => {
    expect(shouldOpenWelcome(-400, -1200, 0)).toBe(false);
  });
});
