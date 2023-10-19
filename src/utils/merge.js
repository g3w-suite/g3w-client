import { hasOwn } from './hasOwn';

export function merge(destination, source) {
  let key;
  for (key in source) {
    if (hasOwn(source, key)) destination[key] = source[key];
  }
};