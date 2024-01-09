/**
 * @file
 * @since 3.10.0 
 */

export default  {
  bind(el, binding, vnode) {
    this.event = (event) => {
      // skip if clicked element is a child of element
      if (el === event.target || el.contains(event.target)) {
        return;
      }
      event.stopPropagation();
      vnode.context[binding.expression](event);
    };
    document.body.addEventListener('click', this.event, true)
  },
  unbind() {
    document.body.removeEventListener('click', this.event, true)
  }
}