/**
 * @file
 * @since 3.10.0
 */

import Panel       from 'core/g3w-panel';
import Component   from 'core/g3w-component';
import G3WObject   from 'core/g3wobject';
import { resolve } from 'utils/resolve';

/**
 * Barstack Class - used to mount panels stack on top of each parent
 * 
 * ORIGINAL SOURCE src/app/gui/utils/barstack.js@v3.9.3
 * 
 */
export class BarStack extends G3WObject {

  constructor() {

    super();

    /** identify the DOM element where insert the component/panel  */
    this._parent = null;

    /** barstack state. It stores the panels array */
    this.state = {
      contentsdata: []
    }

  }

  /**
   * push componenet on top of parent
   */
  push(content, options={}) {
    this._parent = options.parent;
    return this._mount(content, options);
  }

  /**
   * remove last component from stack
   */
  pop() {
    const d = $.Deferred();
    const data = this.state.contentsdata;
    if (data.length) {
      this._unmount(data.slice(-1)[0].content).then(() => { d.resolve(data.pop()) });
    } else {
      d.resolve();
    }
    return d.promise();
  }

  /**
   * clear all stack
   */
  clear() {
    const d = $.Deferred();
    const data = this.state.contentsdata;
    if (data.length) {
      $
        .when(data.map(d => this._unmount(d.content)))
        .then(() => { data.splice(0, data.length); d.resolve(); });
    } else {
      d.resolve();
    }
    this.emit('clear');
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

  /**
   * mount component
   */
  _mount(content, options) {
    // check the type of content:

    // JQuery type
    if (content instanceof jQuery) {
      return this._setJqueryContent(content);
    }

    // String
    if (_.isString(content)) {
      let el = $(content);
      if (!el.length) el = $('<div>' + content + '</div>');
      return this._setJqueryContent(el);
    }

    // Vue
    if (content.mount && 'function' === typeof content.mount) {
      this._checkDuplicateVueContent(content); // if already exist it removed before based on id
      return this._setVueContent(content,options)
    }

    // DOM
    return this._setDOMContent(content);
  }

  /**
   * append jQuery component 
   */
  _setJqueryContent(content, options) {
    $(this._parent).append(content);
    this.state.contentsdata.push({ content, options });
    return resolve();
  }

  /**
   * Append DOM element 
   */
  _setDOMContent(content, options) {
    this._parent.appendChild(content);
    this.state.contentsdata.push({ content, options });
    return resolve();
  }

  /**
   * Mount component to parent 
   */
  _setVueContent(content, options={}) {
    const d = $.Deferred();
    const append = options.append || false;
    content
      .mount(this._parent, append)
      .then(() => {
        $(this._parent).localize();
        // Insert the content into the array with the following attributes:
        // content: component object
        // options: es. title, perc etc ...
        this.state.contentsdata.push({ content, options });
        d.resolve(content);
      });
    return d.promise();
  }

  /**
   * Check duplicate Vue Content 
   */
  _checkDuplicateVueContent(content) {
    let idxToRemove = null;
    const id = content.getId();
    const data = this.state.contentsdata;
    data.forEach((d, i) => { if (d.content.getId && (d.content.getId() == id)) idxToRemove = i; });
    if (!_.isNull(idxToRemove)) {
      data[idxToRemove].content.unmount().then(() => data.splice(idxToRemove,1));
    }
  }

  /**
   * unmount component
   */
  _unmount(content) {
    const d = $.Deferred();
    if (content instanceof Component || content instanceof Panel) {
      content.unmount().then(() => d.resolve());
    } else {
      $(this._parent).empty();
      d.resolve();
    }
    return d.promise();
  }

  forEach(cbk) {
    this.state.contentsdata.forEach(d => cbk(d.content));
  }

  /**
   * @returns number of elements stored in stack
   */
  getLength() {
    return this.state.contentsdata.length;
  }

  /**
   * @since 3.10.0
   */
  getComponentById(id) {
    return (this.getContentData().find(d => d.content.id == id) || {}).content;
  }

}