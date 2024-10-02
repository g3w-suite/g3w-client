/**
 * @file
 * @since v3.7
 */

export default (el, binding) => {
  el.classList.toggle('g3w-disabled', binding.value);
};