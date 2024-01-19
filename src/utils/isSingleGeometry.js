import { isMultiGeometry } from 'utils/isMultiGeometry';

export function isSingleGeometry(geometry) {
  return !isMultiGeometry(geometry.getType());
}