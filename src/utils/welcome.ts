export const WELCOME_OPEN_PROGRESS = 0.5;
export const WELCOME_VELOCITY_PROJECTION_SECONDS = 0.18;

export function shouldOpenWelcome(
  distanceY: number,
  velocityY: number,
  travelDistance: number,
  initialProgress = 0
) {
  if (travelDistance <= 0) return false;

  const dragProgress = -distanceY / travelDistance;
  const projectedVelocityProgress = (-velocityY / travelDistance)
    * WELCOME_VELOCITY_PROJECTION_SECONDS;

  return initialProgress + dragProgress + projectedVelocityProgress > WELCOME_OPEN_PROGRESS;
}
