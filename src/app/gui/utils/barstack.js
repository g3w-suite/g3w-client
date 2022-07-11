import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';
import Component from 'gui/component/component';
import Panel from 'gui/panel';

// Barstack Class
// It used to mount panels stack
// on top of each parent
class BarStack extends G3WObject {
  constructor() {
    super();
    this._parent = null;
    // barstack state. It store the panels array
    this.state = {
      contentsdata: [],
    };
  }

  // push componenet on top of parent
  push(content, options = {}) {
    // parent identify the DOM element where insert (append o meno) the component/panel
    this._parent = options.parent;
    // call barstack mount method
    return this._mount(content, options);
  }

  // remove last component from stack
  pop() {
    const d = $.Deferred();
    if (this.state.contentsdata.length) {
      const { content } = this.state.contentsdata.slice(-1)[0];
      this._unmount(content).then(() => {
        const content = this.state.contentsdata.pop();
        d.resolve(content);
      });
    } else d.resolve();
    return d.promise();
  }

  // clear all stack
  clear() {
    const d = $.Deferred();
    if (this.state.contentsdata.length) {
      const unmountRequests = [];
      this.state.contentsdata.forEach((data) => {
        unmountRequests.push(this._unmount(data.content));
      });
      $.when(unmountRequests).then(() => {
        this.state.contentsdata.splice(0, this.state.contentsdata.length);
        d.resolve();
      });
    } else d.resolve();
    return d.promise();
  }

  getContentData() {
    return this.state.contentsdata;
  }

  getCurrentContentData() {
    return this.state.contentsdata[this.state.contentsdata.length - 1];
  }

  getPreviousContentData() {
    return this.state.contentsdata[this.state.contentsdata.length - 2];
  }

  // mount component
  _mount(content, options) {
    // check the type of content:
    // JQuery type
    if (content instanceof jQuery) return this._setJqueryContent(content);
    // String
    if (_.isString(content)) {
      let jqueryEl = $(content);
      if (!jqueryEl.length) jqueryEl = $(`<div>${content}</div>`);
      return this._setJqueryContent(jqueryEl);
    }
    // Vue
    if (content.mount && typeof content.mount === 'function') {
      this._checkDuplicateVueContent(content); // if already exist it removed before based on id
      return this._setVueContent(content, options);
    }
    // DOM
    return this._setDOMContent(content);
  }

  // JQuery append jQuery component
  _setJqueryContent(content, options) {
    $(this._parent).append(content);
    this.state.contentsdata.push({
      content,
      options,
    });
    return utils.resolve();
  }

  // Append DOM element
  _setDOMContent(content, options) {
    this._parent.appendChild(content);
    this.state.contentsdata.push({
      content,
      options,
    });
    return resolve();
  }

  // Mount component to parent
  _setVueContent(content, options = {}) {
    const d = $.Deferred();
    const append = options.append || false;
    content.mount(this._parent, append)
      .then(() => {
        $(this._parent).localize();
        // Insert the content into the array with the following attributes:
        // content: component object
        // options: es. title, perc etc ...
        this.state.contentsdata.push({
          content,
          options,
        });
        d.resolve(content);
      });
    return d.promise();
  }

  // Check duplicate Vue Content
  _checkDuplicateVueContent(content) {
    let idxToRemove = null;
    const id = content.getId();
    this.state.contentsdata.forEach((data, idx) => {
      if (data.content.getId && (data.content.getId() == id)) idxToRemove = idx;
    });
    if (!_.isNull(idxToRemove)) {
      const data = this.state.contentsdata[idxToRemove];
      data.content.unmount()
        .then(() => this.state.contentsdata.splice(idxToRemove, 1));
    }
  }

  // unmount component
  _unmount(content) {
    const d = $.Deferred();
    if (content instanceof Component || content instanceof Panel) {
      content.unmount()
        .then(() => d.resolve());
    } else {
      $(this._parent).empty();
      d.resolve();
    }
    return d.promise();
  }

  forEach(cbk) {
    this.state.contentsdata.forEach((data) => cbk(data.content));
  }

  // Get lenght / numbero of element stored in stack
  getLength() {
    return this.state.contentsdata.length;
  }
}

export default BarStack;
