import { $promisify } from 'utils/promisify';

export function resolve(value) {
  return $promisify(Promise.resolve(value));
}