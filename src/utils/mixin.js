import { merge } from './merge';

export function mixin(destination,source) {
  const sourceInstance = new source;
  merge(destination, sourceInstance);
  merge(destination.prototype, source.prototype);
}