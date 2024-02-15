const { resolve, inherit } = require('utils');
const G3WObject = require('core/g3wobject');
const Component = require('gui/component/component');
const Panel = require('gui/panel');

//Barstack Class
// It used to mount panels stack
// on top of each parent
function BarStack() {
  this._parent = null;
  // barstack state. It store the panels array
  this.state = {
    contentsdata: []
  }
}

inherit(BarStack, G3WObject);

const proto = BarStack.prototype;

// push componenet on top of parent
proto.push = function(content, options={}) {
  // parent identify the DOM element where insert (append o meno) the component/panel
  this._parent = options.parent;
  // call barstack mount method
  return this._mount(content, options);
};

// remove last component from stack
proto.pop = function() {
  return new Promise((resolve, reject) => {
    if (this.state.contentsdata.length) {
      const content = this.state.contentsdata.slice(-1)[0].content;
      this._unmount(content).then(() => {
        const content = this.state.contentsdata.pop();
        resolve(content)
      })
    } else resolve();
  })
};

// clear all stack
proto.clear = function() {
  return new Promise((resolve, reject) => {
    if (this.state.contentsdata.length) {
      let unmountRequests = [];
      this.state.contentsdata.forEach((data) => {
        unmountRequests.push(this._unmount(data.content));
      });
      Promise.all(unmountRequests)
        .then(() => {
          this.state.contentsdata.splice(0, this.state.contentsdata.length);
          resolve();
        });
    } else resolve();
  })
};

proto.getContentData = function() {
  return this.state.contentsdata
};

proto.getCurrentContentData = function() {
  return this.state.contentsdata[this.state.contentsdata.length - 1];
};

proto.getPreviousContentData = function() {
  return this.state.contentsdata[this.state.contentsdata.length - 2];
};

// mount component
proto._mount = function(content, options) {
  // check the type of content:
  // JQuery type
  if (content instanceof jQuery) return this._setJqueryContent(content);
  //String
  else if (_.isString(content)) {
    let jqueryEl = $(content);
    if (!jqueryEl.length) jqueryEl = $('<div>'+content+'</div>');
    return this._setJqueryContent(jqueryEl);
  }
  // Vue
  else if (content.mount && typeof content.mount == 'function') {
    this._checkDuplicateVueContent(content); // if already exist it removed before based on id
    return this._setVueContent(content,options)
  }
  // DOM
  else return this._setDOMContent(content);
};

// JQuery append jQuery component
proto._setJqueryContent = function(content, options) {
  $(this._parent).append(content);
  this.state.contentsdata.push({
    content,
    options
  });
  return resolve();
};

//Append DOM element
proto._setDOMContent = function(content, options) {
  this._parent.appendChild(content);
  this.state.contentsdata.push({
    content,
    options
  });
  return resolve();
};

// Mount component to parent
proto._setVueContent = function(content, options={}) {
  return new Promise((resolve, reject) => {
    const append = options.append || false;
    content.mount(this._parent, append)
      .then(() => {
        $(this._parent).localize();
        // Insert the content into the array with the following attributes:
        // content: component object
        // options: es. title, perc etc ...
        this.state.contentsdata.push({
          content,
          options
        });
        resolve(content);
      });
  })
};

// Check duplicate Vue Content
proto._checkDuplicateVueContent = function(content) {
  let idxToRemove = null;
  const id = content.getId();
  this.state.contentsdata.forEach((data, idx) => {
    if (data.content.getId && (data.content.getId() == id)) idxToRemove = idx;
  });
  if (!_.isNull(idxToRemove)) {
    const data = this.state.contentsdata[idxToRemove];
    data.content.unmount()
      .then(() => this.state.contentsdata.splice(idxToRemove,1));
  }
};

// unmount component
proto._unmount = function(content) {
  return new Promise((resolve, reject) => {
    if (content instanceof Component || content instanceof Panel) {
      content.unmount()
        .then(() => resolve());
    }
    else {
      $(this._parent).empty();
      resolve();
    }
  })
};

proto.forEach = function(cbk) {
  this.state.contentsdata.forEach(data => cbk(data.content));
};

// Get lenght / numbero of element stored in stack
proto.getLength = function() {
  return this.state.contentsdata.length;
};

module.exports = BarStack;
