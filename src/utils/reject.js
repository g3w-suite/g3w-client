import { $promisify } from 'utils/promisify';

export function reject(value) {
  return $promisify(Promise.reject(value));
}