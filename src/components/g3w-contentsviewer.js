/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';
import { BarStack } from 'core/g3w-barstack';
import { resolve }  from 'utils/resolve';

/**
 * ORIGINAL SOURCE:
 * - src/app/gui/viewport/contentsviewer.js@v3.9.3
 * - src/components/ViewportContentsViewer.vue@v3.9.3
 */
export default function(opts = {}) {

  const stack = new BarStack(); // handles the logic of mounting component on DOM
  const comp  = new Component({
    ...opts,
    title: 'contents',
    vueComponentObject: {
      name: 'viewport-contents-viewer',
      template: `<div id="contents" class="contents"></div>`,
      data: () => ({ state: null }),
    },
  });

  stack.on('clear', () => comp.contentsdata = stack.state.contentsdata);

  Object.assign(comp, {

    stack,

    contentsdata: stack.state.contentsdata,

    // `push` = whether to clean the stack every time, sure to have just one component.
    setContent(opts = {}) {
      const d = $.Deferred();
      (opts.push ? resolve() : stack.clear()).then(() => comp.addContent(opts.content, opts).then(() => d.resolve(opts)));
      comp.setOpen(true);
      return d.promise();
    },

    addContent(content, opts={}) {
      const d = $.Deferred();
      stack.push(content, Object.assign(opts, { parent: comp.internalComponent.$el, append: true })).then(() => {
        comp.contentsdata = stack.state.contentsdata; // get stack content
        Array
          .from(comp.internalComponent.$el.children)  // hide other elements but not the last one
          .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');
        d.resolve();
      });
      return d.promise();
    },

    // remove content from stack
    removeContent() {
      comp.setOpen(false);
      return stack.clear();
    },

    // used by  viewport.js, update the content of contentsdata only after stack is updated
    popContent() {
      return stack.pop().then(() => {
        comp.contentsdata = stack.state.contentsdata;
        Array
          .from(comp.internalComponent.$el.children)       // hide other elements but not the last one
          .forEach((el, i, a) => el.style.display = (i === a.length - 1) ? 'block' : 'none');
      });
    },

    // Set layout of the content each time
    layout(parentWidth) {
      const el = comp.internalComponent.$el;
      Vue.nextTick(() => {                                                     // run only after that vue state is updated
        const height = el.parentElement.clientHeight                           // parent element is "g3w-view-content"
          - ((el.parentElement.querySelector('.close-panel-block') || {}).offsetHeight || 0)
          - ((el.parentElement.querySelector('.content_breadcrumb') || {}).offsetHeight || 0)
          - 10;                                                                // margin 10 from bottom
        el.style.height = height + 'px';
        if (el.firstChild) {
          el.firstChild.style.height = height + 'px';
        }
        stack.state.contentsdata.forEach(d => {                                // re-layout each component stored into the stack
          if ('function' == typeof d.content.layout) {  
            d.content.layout(parentWidth + 0.5, height);
          }
        })
      })
    },

    getComponentById:       stack.getComponentById.bind(stack),
    getContentData:         stack.getContentData.bind(stack),
    getCurrentContentData:  stack.getCurrentContentData.bind(stack),
    getPreviousContentData: stack.getPreviousContentData.bind(stack),
    clearContents:          stack.clear.bind(stack),

  }); 

  return comp;
}