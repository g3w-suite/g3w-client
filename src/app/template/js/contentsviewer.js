const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Stack = require('./barstack.js');
const Component = require('gui/vue/component');
const compiledTemplate = Vue.compile(require('../html/contentsviewer.html'));

// Internal Component (VUE) of the content of the  viewport
const InternalComponent = Vue.extend({
  ...compiledTemplate,
  data: function() {
    return {
      state: null
    }
  }
});

function ContentsViewerComponent(options) {
  base(this, options);
  this.stack = new Stack();
  this.setService(this);
  this.title = "contents";
  this.contentsdata = this.stack.state.contentsdata;
  this.state.visible = true;
  this.setInternalComponent(new InternalComponent({
    service: this
  }));
  this.internalComponent.state = this.state;
}

inherit(ContentsViewerComponent, Component);

const proto = ContentsViewerComponent.prototype;

proto.setContent = function(options={}) {
  const d = $.Deferred();
  const push = options.push || false;
  const content = options.content;
  // clean the stack every time, sure to have just one component.
  // Use barstack because it handle the logic og mounting component on DOM
  if (!push) {
    // clear stack
    this.clearContents()
    .then(() => {
      this.addContent(content, options)
      .then(() => {
        d.resolve(options);
      })
    })
  } else {
    this.addContent(content,options)
    .then(() => {
      d.resolve(options);
    })
  }
  this.setOpen(true);
  return d.promise();
};

proto.addContent = function(content, options) {
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
};

// remove content from stack
proto.removeContent = function() {
  this.setOpen(false);
  return this.clearContents();
};

// used by  viewport.js
proto.popContent = function() {
  return this.stack.pop()
  .then(() => {
    // updatethe content of contentsdata only after stack is updated
    this.contentsdata = this.stack.state.contentsdata;
    this.updateContentVisibility();
  });
};

// get component through class
proto.getComponentByClass = function(componentClass) {
  let component;
  const contentdata = this.stack.getContentData();
  contentdata.forEach((content) => {
    if (content.content instanceof componentClass) {
      component = content.content;
      return false
    }
  });
  return component
};

// get component by component id
proto.getComponentById = function(id) {
  let component;
  const contentdata = this.stack.getContentData();
  contentdata.forEach((content) => {
    if (content.content.id == id) {
      component = content.content;
      return false
    }
  });
  return component
};

proto.getContentData = function() {
  return this.stack.getContentData();
};

// get current contentdata
proto.getCurrentContentData = function(){
  return this.stack.getCurrentContentData();
};

// get  previuos contentdata
proto.getPreviousContentData = function() {
  return this.stack.getPreviousContentData();
};

// update visibility of the components of content
proto.updateContentVisibility = function() {
  // hide each elements but not the last one
  const contentsEls = $(this.internalComponent.$el).children();
  contentsEls.hide();
  contentsEls.last().show();
};

// stack clear because if we want the contentComponente stack
// it has to be empty stack
proto.clearContents = function() {
  return this.stack.clear()
  .then(() => {
    this.contentsdata = this.stack.state.contentsdata;
  })
};

// Set layout of the content each time
// Parameters are: height and with of the parent content
proto.layout = function(parentWidth, parentHeight) {
  const el = $(this.internalComponent.$el);
  //run the callback only after that vue state is updated
  Vue.nextTick(() => {
    const contentsdata = this.stack.state.contentsdata;
    // el.parent() is div g3w-view-content
    const height = el.parent().height() - el.siblings('.close-panel-block').outerHeight(true) - el.siblings('.g3w_contents_back').outerHeight(true);
    el.height(height);
    el.children().first().height(height);
    contentsdata.forEach((data) => {
      //check each componentstored in stack
      if (typeof data.content.layout == 'function') {
        //call function layout of each component that are stored into the stack
        data.content.layout(parentWidth + 0.5, height);
      }
    })
  })
};

module.exports = ContentsViewerComponent;
