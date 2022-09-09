/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-disabled.js@v3.6
 */
export default (el, binding) => {
  binding.value ? el.classList.add('g3w-disabled') : el.classList.remove('g3w-disabled');
};