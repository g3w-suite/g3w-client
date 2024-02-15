import { INCHES_PER_UNIT, DOTS_PER_INCH } from 'constant';

export function getResolutionFromScale(scale, units = 'm') {
  const normScale = (scale >= 1.0) ? (1.0 / scale) : scale; // just to prevent that scale is passed as 1:10000 or 0.0001
  return  1 / (normScale * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
};