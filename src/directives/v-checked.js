/**
 * ORIGINAL SOURCE: src/app/gui/vue/directives/v-checked.js@v3.6
 */
export default (el, binding) => {
  binding.value ? el.setAttribute('checked','checked') : el.removeAttribute('checked');
};