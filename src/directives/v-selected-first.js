/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-selected-first.js@v3.6
 */
export default (el, binding) => {
  binding.value===0 ? el.setAttribute('selected','') : el.removeAttribute('selected');
};