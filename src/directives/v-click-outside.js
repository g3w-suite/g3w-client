/**
 * @file
 * @since 3.10.0 
 */

export default  {
  bind(el, binding, vnode) {
    this.event = e => {
      // skip if a clicked element is a child of element
      if (el === e.target || el.contains(e.target)) {
        return;
      }
      e.stopPropagation();
      vnode.context[binding.expression](e);
    };
    document.body.addEventListener('click', this.event, true)
  },
  unbind() {
    document.body.removeEventListener('click', this.event, true)
  }
}