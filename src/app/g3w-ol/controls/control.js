import MapControlButton from 'components/MapControlButton';

const { layout } = require('g3w-ol/controls/utils');

const Control = function(options={}) {
  const {name="", visible=true, enabled=false} = options;
  this._enabled = enabled;
  this.offline = options.offline !== undefined ? options.offline : true;
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  this.eventKeys = {}; // store eventKey and original havenHandler
  /*
    tl: top-left
    tr: top-right
    bl: bottom-left
    bt: bottom-right
   */
  this.positionCode = options.position || 'tl';
  this.priority = options.priority || 0;
  if (!options.element) {
    const mapControlButtonVue =  Vue.extend(MapControlButton({
      className: "ol-"+this.name.split(' ').join('-').toLowerCase(),
      customClass: options.customClass,
      tipLabel: options.tipLabel || this.name,
      label: options.label || ''
    }));
    options.element = new mapControlButtonVue().$mount().$el;
  }
  const buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  $(options.element).on('click',buttonClickHandler);
  ol.control.Control.call(this, options);
  this.setVisible(visible);
  this._postRender();
};

ol.inherits(Control, ol.control.Control);

const proto = Control.prototype;


//return if clickmap
proto.isClickMap = function(){
  return this.clickmap;
};

proto.isToggled = function() {
  return this._toggled;
};

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
 * Method to handle toggle map controls
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

//shift of control position
proto.shiftPosition = function(position) {
  $(this.element).css(hWhere, position+'px');
};

// layout handler
proto.layout = function(map) {
  if (map) {
    const position =  this.getPosition();
    const element = $(this.element);
    layout({map, position, element})
  }
};

// change layout of controls // overwrite to customize beahviour
proto.changelayout = function(map) {};

//called when a control is added ore removed to map (added: map is an ol.Map instance , removed map is null)
proto.setMap = function(map) {
  if (map) {
    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }
};
/**
 *
 */
proto.showControl = function(){
  $(this.element).show();
};

//hide control and move all controls that sit on his right position
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

proto.getEnable = function() {
  return this._enabled;
};

proto.setVisible = function(visible=true){
  this._visible = visible;
  $(this.element)[visible ? 'show': 'hide']();
};

proto.isVisible = function(){
  return this._visible;
};


proto._postRender = function() {};

module.exports = Control;
