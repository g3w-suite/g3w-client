import { merge } from './merge';

export function basemixin(destination, source) {
  return merge(destination.prototype, source);
};