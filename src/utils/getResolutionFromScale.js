import { INCHES_PER_UNIT, DOTS_PER_INCH } from 'constant';

export function getResolutionFromScale(scale, units = 'm') {
   // just to prevent that scale is passed as 1:10000 or 0.0001
  return  1 / (((scale >= 1.0) ? (1.0 / scale) : scale) * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
}