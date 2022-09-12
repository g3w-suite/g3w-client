/**
 * TODO: refactor stateful directives (eg. "v-t") in order to delete this file: "src/directives/utils.js"
 */

const {uniqueId} = require('core/utils/utils');

/**
 * State
 */
const vm = new Vue();
const directives = {};

/**
 * @deprecated
 */
export const createDirectiveObj = ({el, attr, watcher, handler, modifiers}) => {
  const unique_attr_id = uniqueId();
  el.setAttribute(attr, unique_attr_id);
  const dir = directives[unique_attr_id] = {};
  if (watcher) {
    dir.unwatch = vm.$watch(watcher[0], watcher[1]);
  }
  if (handler) {
    dir.handler = handler;
  }
  if (modifiers) {
    dir.modifiers = modifiers;
  }
  return unique_attr_id;
};

/**
 * @deprecated
 */
export const unbindWatch = ({attr, el}) => {
  const unique_attr_id = el.getAttribute(attr);
  if (unique_attr_id) {
    directives[unique_attr_id].unwatch();
    delete directives[unique_attr_id];
  }
};

/**
 * @deprecated
 */
export const getDirective = (unique_attr_id) => directives[unique_attr_id];

