/**
 * @TODO refactor stateful directives (eg. "v-t") in order to delete this file: "src/directives/utils.js"
 */

const { uniqueId } = require('utils');

/**
 * Internal state
 */
const vm         = new Vue();
const directives = {};

export const watch = ({ el, attr, watcher, immediate = true } = {}) => {
  const unique_attr_id = uniqueId();
  el.setAttribute(attr, unique_attr_id);
  const dir = directives[unique_attr_id] = {};
  if (watcher) {
    dir.unwatch = vm.$watch(watcher[0], watcher[1], watcher[2] || { immediate });
    dir.handler = watcher[1];
  }
  return unique_attr_id;
};

export const unwatch = ({ el, attr } = {}) => {
  const unique_attr_id = el.getAttribute(attr);
  if (unique_attr_id) {
    directives[unique_attr_id].unwatch();
    delete directives[unique_attr_id];
  }
};

export const trigger = ({el, attr, data}) => directives[el.getAttribute(attr)].handler(data);

