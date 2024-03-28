/**
 * @file
 * @since 3.10.0
 */

import Panel       from 'core/g3w-panel';
import Component   from 'core/g3w-component';
import G3WObject   from 'core/g3wobject';

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

    /** barstack state. It stores the panel array */
    this.state = {
      contentsdata: [] // Array<{ content, options }> 
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
   * remove the last component from stack
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
   * clear all stacks
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
   * Mount component to parent
   */
  _mount(content, options) {
    const d    = $.Deferred();
    const data = this.state.contentsdata;

    // check the type of content:

    // String or JQuery
    if (content instanceof jQuery || _.isString(content)) {
      let el = _.isString(content) ? ($(content).length ? $('<div>' + content + '</div>') : $(content)) : content
      $(this._parent).append(el);
      data.push({ content: el, options });
      console.warn('[G3W-CLIENT] jQuery components will be discontinued, please update your code as soon as possible', data[data.length - 1]);
      d.resolve();
    }

    // Vue element
    else if (content.mount && 'function' === typeof content.mount) {
      // Check duplicate element by component id (if already exist)
      let id = data.findIndex(d => d.content.getId && (d.content.getId() === content.getId()));
      if (-1 !== id) {
        data[id].content.unmount().then(() => data.splice(id, 1));
      }
      // Mount vue component 
      content
        .mount(this._parent, options.append || false)
        .then(() => {
          $(this._parent).localize();
          data.push({ content, options });
          d.resolve(content);
        });

    }

    // DOM element
    else {
      this._parent.appendChild(content);
      data.push({ content, options });
      d.resolve();
    }

    return d.promise();

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