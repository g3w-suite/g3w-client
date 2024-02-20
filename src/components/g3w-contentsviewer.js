/**
 * @file
 * @since 3.10.0
 */

import Component    from 'core/g3w-component';
import { BarStack } from 'core/g3w-barstack';

import * as vueComp from 'components/ViewportContentsViewer.vue';

/**
 * ORIGINAL SOURCE: src/app/gui/viewport/contentsviewer.js@v3.9.3
 */
export default function(opts = {}) {
  const comp = new Component({
    ...opts,
    title: "contents",
    visible: true,
  });

  comp.stack        = new BarStack();
  comp.contentsdata = comp.stack.state.contentsdata;

  comp.setService(comp);
  comp.setInternalComponent(new (Vue.extend(vueComp))({ service: comp }));

  Object.assign(comp, {

    setContent(opts = {}) {
      const { push=false, content } = opts;
      const d = $.Deferred();
      // clean the stack every time, sure to have just one component.
      // Use barstack because it handle the logic og mounting component on DOM
      if (push) {
        comp.addContent(content, opts).then(() => d.resolve(opts));
      } else {
        // clear stack
        comp.clearContents().then(() => { comp.addContent(content, opts).then(() => d.resolve(opts)); })
      }
    
      comp.setOpen(true);
      return d.promise();
    },

    addContent(content, opts={}) {
      const d = $.Deferred();
      opts.parent = comp.internalComponent.$el;            // parent element is the internal element
      opts.append = true;
      comp.stack.push(content, opts).then(() => {
        comp.contentsdata = comp.stack.state.contentsdata; // get stack content
        comp.updateContentVisibility();                    // update the visibility of the others components
        d.resolve();
      });
      return d.promise();
    },

    // remove content from stack
    removeContent() {
      comp.setOpen(false);
      return comp.clearContents();
    },

    // used by  viewport.js, update the content of contentsdata only after stack is updated
    popContent() {
      return comp.stack.pop().then(() => {
        comp.contentsdata = comp.stack.state.contentsdata;
        comp.updateContentVisibility();
      });
    },

    // get component through class
    getComponentByClass(Class) {
      let component;
      comp.getContentData().forEach(d => {
        if (d.content instanceof Class) {
          component = d.content;
          return false;
        }
      });
      return component;
    },

    // get component by component id
    getComponentById(id) {
      let component;
      comp.getContentData().forEach(d => {
        if (d.content.id == id) {
          component = d.content;
          return false
        }
      });
      return component;
    },

    getContentData() {
      return comp.stack.getContentData()
    },

    // get current contentdata
    getCurrentContentData() {
      return comp.stack.getCurrentContentData();
    },

    // get  previuos contentdata
    getPreviousContentData() {
      return comp.stack.getPreviousContentData();
    },

    // update visibility of the components of content (hide each elements but not the last one)
    updateContentVisibility() {
      const contentsEls = $(comp.internalComponent.$el).children();
      contentsEls.hide();
      contentsEls.last().show();
    },

    // stack clear because if we want the contentComponente stack it has to be empty stack
    clearContents() {
      return comp.stack.clear().then(() => comp.contentsdata = comp.stack.state.contentsdata);
    },

    // Set layout of the content each time
    // Parameters are: height and with of the parent content
    layout(parentWidth) {
      const el = $(comp.internalComponent.$el);
      //run the callback only after that vue state is updated
      Vue.nextTick(() => {
        const contentsdata = comp.stack.state.contentsdata;
        // el.parent() is div g3w-view-content
        const height = el.parent().height()
          - el.siblings('.close-panel-block').outerHeight(true)
          - el.siblings('.content_breadcrumb').outerHeight(true)
          - 10; // margin 10 from bottom
        el.height(height);
        el.children().first().height(height);
        contentsdata.forEach(data => {
          //check each componentstored in stack
          if ('function' == typeof data.content.layout) {
            //call function layout of each component that are stored into the stack
            data.content.layout(parentWidth + 0.5, height);
          }
        })
      })
    },

  }); 

  return comp;
}