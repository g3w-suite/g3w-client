/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-disabled.js@v3.6
 */
export default (el, binding) => {
  el.classList.toggle('g3w-disabled', binding.value);
};