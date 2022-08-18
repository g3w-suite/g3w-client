export default (el, binding) => {
  binding.value===0 ? el.setAttribute('selected','') : el.removeAttribute('selected');
};