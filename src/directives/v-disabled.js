/**
 * @file
 * @since v3.7
 */

export default (el, binding) => {
  const className = 'g3w-disabled';
  if (binding.value) {
    if (!el.classList.contains(className)) {
      el.classList.add(className)
    }
  } else {
    el.classList.remove(className);
  }
};