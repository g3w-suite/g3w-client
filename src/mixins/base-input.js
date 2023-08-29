/**
 * @file
 * @deprecated since 3.9.0. Will be removed in 4.x. Use g3wInputMixin instead. 
 */

import {baseInputMixin} from './g3w-input';

console.assert(undefined !== baseInputMixin, 'baseInputMixin is undefined');

export default {
  ...baseInputMixin
};