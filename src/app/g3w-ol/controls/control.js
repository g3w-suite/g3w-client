import MapControlButton from 'components/MapControlButton';

/**
 * @FIXME add description
 */
const layout = function ({ map, position, element }) {};

/**
 * @param {Object}  options 
 * @param {string}  options.name
 * @param {boolean} options.enabled 
 */
const Control = function(options={}) {

  const {
    name="",
    visible=true,
    enabled=false
  } = options;

  /**
   * @FIXME add description
   */
  this._enabled = enabled;

  /**
   * @FIXME add description
   */
  this.offline = options.offline !== undefined ? options.offline : true;

  /**
   * @FIXME add description
   */
  this.name = name.split(' ').join('-').toLowerCase();

  /**
   * @FIXME add description
   */
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));

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

  if (!options.element) {
    const mapControlButtonVue =  Vue.extend(MapControlButton({
      className:   "ol-"+this.name.split(' ').join('-').toLowerCase(),
      customClass: options.customClass,
      tipLabel:    options.tipLabel || this.name,
      label:       options.label    || '',
    }));
    options.element = new mapControlButtonVue().$mount().$el;
  }

  // button click handler
  $(options.element).on('click', options.buttonClickHandler || Control.prototype._handleClick.bind(this));

  // parent constructor
  ol.control.Control.call(this, options);

  this.setVisible(visible);

  this._postRender();
};

ol.inherits(Control, ol.control.Control);

const proto = Control.prototype;


/**
 * return if clickmap
 */
proto.isClickMap = function(){
  return this.clickmap;
};

/**
 * @FIXME add description
 */
proto.isToggled = function() {
  return this._toggled;
};

/**
 * @FIXME add description
 */
proto.setEventKey = function({eventType, eventKey}){
  this.eventKeys[eventType] = {
    eventKey,
    originalHandler: eventKey.listener
  };
};

/**
 * Reset original handler method of control event.
 * 
 * @param {string} eventType
 */
proto.resetOriginalHandlerEvent = function(eventType) {
  if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
    ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
    this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
  }
};

/**
 * Override original handler method of control event.
 * 
 * @param {string} eventType
 * @param {() => {}} handler
 */
proto.overwriteEventHandler = function({eventType, handler}) {
  if (this.eventKeys[eventType] && this.eventKeys[eventType].eventKey) {
    ol.Observable.unByKey(this.eventKeys[eventType].eventKey);
    this.eventKeys[eventType].eventKey = this.on(eventType, handler);
  }
};

/**
 * @FIXME add description
 */
proto.getPosition = function(positionCode) {
  positionCode = positionCode || this.positionCode;
  const position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  position ['bottom'] = (positionCode.indexOf('b') > -1) ? true : false;
  position ['right'] = (positionCode.indexOf('r') > -1) ? true : false;
  return position;
};

/**
 * Handle toggle of map controls
 * 
 * @param event
 */
proto._handleClick = function(event) {
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
};

/**
 * shift control's position
 */
proto.shiftPosition = function(position) {
  $(this.element).css(hWhere, position+'px');
};

/**
 * layout handler 
 */
proto.layout = function(map) {
  if (map) {
    const position =  this.getPosition();
    const element = $(this.element);
    layout({map, position, element})
  }
};

/**
 * change layout of controls
 */
proto.changelayout = function(map) {
  // overwrite to customize beahviour
};

/**
 * Called when a control is added ore removed to map
 * 
 * @param {ol.Map | null} map instace to be added (null = remove from map)
 */
proto.setMap = function(map) {
  if (map) {
    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }
};

/**
 * @FIXME add description
 */
proto.showControl = function(){
  $(this.element).show();
};

/**
 * Hide control and move all controls that sit on his right position
 */
proto.hideControl = function() {
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
};

/**
 * Toggle pointer events and `g3w-ol-disabled` class on map control button
 * 
 * @param {boolean} enabled wheter the map control button is clickable
 */
proto.setEnable = function(enabled) {
  $(this.element).find('button').first().toggleClass('g3w-ol-disabled', !enabled);
  if(!enabled && this._interaction) {
    this._interaction.setActive(false);
  }
  this._enabled = enabled;
};

/**
 * @FIXME add description
 */
proto.getEnable = function() {
  return this._enabled;
};

/**
 * @FIXME add description
 */
proto.setVisible = function(visible=true){
  this._visible = visible;
  $(this.element)[visible ? 'show': 'hide']();
};

/**
 * @FIXME add description
 */
proto.isVisible = function(){
  return this._visible;
};

/**
 * @FIXME add description
 */
proto._postRender = function() {};

module.exports = Control;
