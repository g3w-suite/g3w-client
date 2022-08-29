export default (el, binding) => {
  binding.value ? el.classList.add('g3w-disabled') : el.classList.remove('g3w-disabled');
};