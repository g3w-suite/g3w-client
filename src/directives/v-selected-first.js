/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-selected-first.js@v3.6
 */
export default (el, binding) => {
  el.toggleAttribute('selected', binding.value === 0);
};