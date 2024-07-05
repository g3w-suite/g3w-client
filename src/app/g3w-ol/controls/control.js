import MapControlButton from 'components/MapControlButton';

module.exports = class Control extends ol.control.Control {

  /**
   * @param {Object}  options 
   * @param {string}  options.name
   * @param {boolean} options.enabled 
   */
  constructor (options ={ }) {

    options.name    = undefined !== options.name    ? options.name    : '';
    options.visible = undefined !== options.enabled ? options.enabled : true;
    options.enabled = undefined !== options.enabled ? options.enabled : false;    

    const name = options.name.split(' ').join('-').toLowerCase();

    if (!options.element) {
      const mapControlButtonVue =  Vue.extend(MapControlButton({
        className:   "ol-" + name,
        customClass: options.customClass,
        tipLabel:    options.tipLabel || name,
        label:       options.label    || '',
      }));
      options.element = new mapControlButtonVue().$mount().$el;
    }

    super(options);

    /**
     * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
     */
    this._originalonlick = null;

    /**
     * custom "onclick" handler
     */
    this._onclick        = options.onclick; // a method trigger when click on map control button

    /**
     * @FIXME add description
     */
    this._enabled = options.enabled;

    /**
     * @FIXME add description
     */
    this.offline = options.offline !== undefined ? options.offline : true;

    /**
     * @FIXME add description
     */
    this.name = name;

    /**
     * @FIXME add description
     */
    this.id = this.name + '_' + (Math.floor(Math.random() * 1000000));

    /**
     * store eventKey and original havenHandler
     */
    this.eventKeys = {};

    /*
      tl: top-left
      tr: top-right
      bl: bottom-left
      bt: bottom-right
    */
    this.positionCode = options.position || 'tl';

    /**
     * @FIXME add description
     */
    this.priority = options.priority || 0;

    // button click handler
    $(options.element).on('click', options.buttonClickHandler || Control.prototype._handleClick.bind(this));

    this.setVisible(options.visible);

    this._postRender();
  }

  /**
   * return if clickmap
   */
  isClickMap() {
    return this.clickmap;
  }

  /**
   * @FIXME add description
   */
  isToggled() {
    return this._toggled;
  }

  /**
   * @FIXME add description
   */
  setEventKey({eventType, eventKey}){
    this.eventKeys[eventType] = {
      eventKey,
      originalHandler: eventKey.listener
    };
  }

  /**
   * Reset original handler method of control event.
   * 
   * @param {string} eventType
   */
  resetOriginalHandlerEvent(eventType) {
    if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
      ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
      this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
    }
  }

  /**
   * Override original handler method of control event.
   * 
   * @param {string} eventType
   * @param {() => {}} handler
   */
  overwriteEventHandler({eventType, handler}) {
    if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
      ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
      this.eventKeys[eventType].eventKey = this.on(eventType, handler);
    }
  }

  /**
   * @FIXME add description
   */
  getPosition(positionCode) {
    positionCode = positionCode || this.positionCode;
    return {
      top: (positionCode.indexOf('t') > -1) ? true : false,
      left: (positionCode.indexOf('l') > -1) ? true : false,
      bottom: (positionCode.indexOf('b') > -1) ? true : false,
      right: (positionCode.indexOf('r') > -1) ? true : false,
    };
  }

  /**
   * Handle toggle of map controls
   * 
   * @param event
   */
  _handleClick(event) {
    event.preventDefault();
    const map = this.getMap();
    let resetControl = null;
    // remove all the other, eventually toggled, interactioncontrols
    const controls = map.getControls();
    this._toggled && controls.forEach(control => {
      if (control.id && control.toggle && (control.id !== this.id)) {
        control.toggle(false);
        if (control.name === 'reset') resetControl = control;
      }
    });
    if (!this._toggled && resetControl) resetControl.toggle(true);
    this.dispatchEvent('controlclick');
  }

  /**
   * shift control's position
   */
  shiftPosition(position) {
    $(this.element).css(hWhere, position+'px');
  }

  /**
   * layout handler 
   */
  layout(map) {
    if (map) {
      const position =  this.getPosition();
      const element = $(this.element);
    }
  }

  /**
   * @virtual change layout of controls
   */
  changelayout(map) {
    // overwrite to customize beahviour
  }

  /**
   * Called when a control is added ore removed to map
   * 
   * @param {ol.Map | null} map instace to be added (null = remove from map)
   */
  setMap(map) {
    if (!map) {
      return
    }

    this.layout(map);

    ol.control.Control.prototype.setMap.call(this, map);

    /** ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0 */
    if (this._onclick) {
      const controlElement = $(this.element);
      const buttonControl  = controlElement.children('button');
      let cliccked = false;
      controlElement.on('click', async() => {
        // skip when ...
        if (cliccked) {
          return;
        }
        cliccked = true;
        buttonControl.addClass('g3w-ol-disabled');
        if (this._onclick) {
          await this._onclick();
        }
        buttonControl.removeClass('g3w-ol-disabled');
        cliccked = false;
      })
    }

  }

  /**
   * @FIXME add description
   */
  showControl() {
    $(this.element).show();
  }

  /**
   * Hide control and move all controls that sit on his right position
   */
  hideControl() {
    let position = $(this.element).position().left;
    let controlWidth = $(this.element).outerWidth();
    let newPosition = position;
    const controls = $(this.element).siblings('.ol-control-tl');
    controls.each(function() {
      if ($(this).position().left > position) {
        newPosition = $(this).position().left;
        if (controlWidth > $(this).outerWidth()) {
          position = position + (controlWidth - $(this).outerWidth())
        }
        $(this).css('left', position+'px');
        position = newPosition;
        controlWidth = $(this).outerWidth();
      }
    });
    $(this.element).hide();
  }

  /**
   * Toggle pointer events and `g3w-ol-disabled` class on map control button
   * 
   * @param {boolean} enabled wheter the map control button is clickable
   */
  setEnable(enabled) {
    $(this.element).find('button').first().toggleClass('g3w-ol-disabled', !enabled);
    if(!enabled && this._interaction) {
      this._interaction.setActive(false);
    }
    this._enabled = enabled;
  }

  /**
   * @FIXME add description
   */
  getEnable() {
    return this._enabled;
  }

  /**
   * @FIXME add description
   */
  setVisible(visible=true) {
    this._visible = visible;
    $(this.element)[visible ? 'show': 'hide']();
  }

  /**
   * @FIXME add description
   */
  isVisible() {
    return this._visible;
  }

  /**
   * @virtual
   */
  _postRender() {}

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
   *
   * @since 3.10.1
   */
  overwriteOnClickEvent(clickHandler){
    this._originalonlick = this._originalonlick || this._onclick;
    this._onclick        = clickHandler;
  };

  /**
   * ORIGINAL SOURCE: src/app/g3w-ol/controls/onclickcontrol.js@v3.10.0
   *
   * @since 3.10.1
   */
  resetOriginalOnClickEvent() {
    this._onclick        = this._originalonlick || this._onclick;
    this._originalonlick = null;
  }

}