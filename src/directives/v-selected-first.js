/**
 * @file
 * @since v3.7
 */

export default (el, binding) => {
  el.toggleAttribute('selected', 0 === binding.value);
};