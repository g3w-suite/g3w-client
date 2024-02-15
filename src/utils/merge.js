import { hasOwn } from './hasOwn';

export function merge(destination, source) {
  for (let key in source) {
    if (hasOwn(source, key)) {
      destination[key] = source[key];
    }
  }
};