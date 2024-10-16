import { INCHES_PER_UNIT, DOTS_PER_INCH } from 'g3w-constants';

export function getScaleFromResolution(resolution, units = 'm') {
  return Math.round(resolution * INCHES_PER_UNIT[units] * DOTS_PER_INCH);
}