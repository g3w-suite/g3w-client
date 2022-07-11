import { barstack as Stack } from 'gui/utils/utils';
import Component from 'gui/component/component';
import template from './contentsviewer.html';

// Internal Component (VUE) of the content of the  viewport
const InternalComponent = Vue.extend({
  template,
  data() {
    return {
      state: null,
    };
  },
});

class ContentsViewerComponent extends Component {
  constructor(options = {}) {
    super(options);
    this.stack = new Stack();
    this.setService(this);
    this.title = 'contents';
    this.contentsdata = this.stack.state.contentsdata;
    this.state.visible = true;
    const internalComponent = new InternalComponent({
      service: this,
    });
    this.setInternalComponent(internalComponent);
    this.internalComponent.state = this.state;
  }

  setContent(options = {}) {
    const d = $.Deferred();
    const push = options.push || false;
    const { content } = options;
    // clean the stack every time, sure to have just one component.
    // Use barstack because it handle the logic og mounting component on DOM
    if (!push) {
      // clear stack
      this.clearContents()
        .then(() => {
          this.addContent(content, options)
            .then(() => d.resolve(options));
        });
    } else {
      this.addContent(content, options)
        .then(() => d.resolve(options));
    }
    this.setOpen(true);
    return d.promise();
  }

  addContent(content, options = {}) {
    const d = $.Deferred();
    // parent element is the internal element
    options.parent = this.internalComponent.$el;
    options.append = true;
    const promise = this.stack.push(content, options);
    promise.then(() => {
      // get stack content
      this.contentsdata = this.stack.state.contentsdata;
      // update the visibility of the others components
      this.updateContentVisibility();
      d.resolve();
    });
    return d.promise();
  }

  // remove content from stack
  removeContent() {
    this.setOpen(false);
    return this.clearContents();
  }

  // used by  viewport.js
  popContent() {
    return this.stack.pop()
      .then(() => {
        // update the content of contentsdata only after stack is updated
        this.contentsdata = this.stack.state.contentsdata;
        this.updateContentVisibility();
      });
  }

  // get component through class
  getComponentByClass(componentClass) {
    let component;
    const contentdata = this.stack.getContentData();
    contentdata.forEach((content) => {
      if (content.content instanceof componentClass) {
        component = content.content;
        return false;
      }
    });
    return component;
  }

  // get component by component id
  getComponentById(id) {
    let component;
    const contentdata = this.stack.getContentData();
    contentdata.forEach((content) => {
      if (content.content.id == id) {
        component = content.content;
        return false;
      }
    });
    return component;
  }

  getContentData() {
    return this.stack.getContentData();
  }

  // get current contentdata
  getCurrentContentData() {
    return this.stack.getCurrentContentData();
  }

  // get  previuos contentdata
  getPreviousContentData() {
    return this.stack.getPreviousContentData();
  }

  // update visibility of the components of content
  updateContentVisibility() {
    // hide each elements but not the last one
    const contentsEls = $(this.internalComponent.$el).children();
    contentsEls.hide();
    contentsEls.last().show();
  }

  // stack clear because if we want the contentComponente stack
  // it has to be empty stack
  clearContents() {
    return this.stack.clear().then(() => this.contentsdata = this.stack.state.contentsdata);
  }

  // Set layout of the content each time
  // Parameters are: height and with of the parent content
  layout(parentWidth, parentHeight) {
    const el = $(this.internalComponent.$el);
    // run the callback only after that vue state is updated
    Vue.nextTick(() => {
      const { contentsdata } = this.stack.state;
      // el.parent() is div g3w-view-content
      const height = el.parent().height() - el.siblings('.close-panel-block').outerHeight(true) - 10; // margin 10 from bottom
      el.height(height);
      el.children().first().height(height);
      contentsdata.forEach((data) => {
        // check each componentstored in stack
        if (typeof data.content.layout === 'function') {
          // call function layout of each component that are stored into the stack
          data.content.layout(parentWidth + 0.5, height);
        }
      });
    });
  }
}

export default ContentsViewerComponent;
