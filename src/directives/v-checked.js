/**
 * @file
 * @since v3.7
 */

export default (el, binding) => {
  binding.value ? el.setAttribute('checked','checked') : el.removeAttribute('checked');
};