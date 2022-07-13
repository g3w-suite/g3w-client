const { layout } = require('./utils');

const Control = function (options = {}) {
  const { name = '', visible = true, enabled = false } = options;
  this._enabled = enabled;
  this.offline = options.offline !== undefined ? options.offline : true;
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = `${this.name}_${Math.floor(Math.random() * 1000000)}`;
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
    const className = `ol-${this.name.split(' ').join('-').toLowerCase()}`;
    const { customClass } = options;
    const tipLabel = options.tipLabel || this.name;
    const label = options.label || '';
    const mapControlButtonVue = Vue.extend({
      functional: true,
      render(h) {
        return h('div', {
          class: {
            [className]: !!className,
            'ol-unselectable': true,
            'ol-control': true,
          },
        }, [
          h('button', {
            attrs: {
              type: 'button',
            },
            directives: [{
              name: 't-tooltip',
              value: tipLabel,
            }],
          }, [
            label,
            h('i', {
              class: {
                [customClass]: !!customClass,
              },
            }),
          ]),
        ]);
      },
    });
    const mapControlButtonDOMElement = new mapControlButtonVue().$mount().$el;
    options.element = mapControlButtonDOMElement;
  }
  const buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  $(options.element).on('click', buttonClickHandler);
  ol.control.Control.call(this, options);
  this.setVisible(visible);
  this._postRender();
};

ol.inherits(Control, ol.control.Control);

const proto = Control.prototype;

// return if clickmap
proto.isClickMap = function () {
  return this.clickmap;
};

proto.isToggled = function () {
  return this._toggled;
};

proto.setEventKey = function ({ eventType, eventKey }) {
  this.eventKeys[eventType] = {
    eventKey,
    originalHandler: eventKey.linstener,
  };
};

proto.resetOriginalHandlerEvent = function (eventType) {
  const { eventKey } = this.eventKeys[eventType];
  eventKey && ol.Observable.unByKey(eventKey);
  this.eventKeys[eventType].eventKey = this.on(eventType, this.eventKeys[eventType].originalHandler);
};

proto.overwriteEventHandler = function ({ eventType, handler }) {
  const { eventKey } = this.eventKeys[eventType];
  eventKey && ol.Observable.unByKey(eventKey);
  this.eventKeys[eventType].eventKey = this.on(eventType, handler);
};

proto.getPosition = function (positionCode) {
  positionCode = positionCode || this.positionCode;
  const position = {};
  position.top = (positionCode.indexOf('t') > -1);
  position.left = (positionCode.indexOf('l') > -1);
  position.bottom = (positionCode.indexOf('b') > -1);
  position.right = (positionCode.indexOf('r') > -1);
  return position;
};

/**
 * Method to handle toggle map controls
 * @param event
 */
proto._handleClick = function (event) {
  event.preventDefault();
  const map = this.getMap();
  let resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  const controls = map.getControls();
  this._toggled && controls.forEach((control) => {
    if (control.id && control.toggle && (control.id !== this.id)) {
      control.toggle(false);
      if (control.name === 'reset') resetControl = control;
    }
  });
  if (!this._toggled && resetControl) resetControl.toggle(true);
  this.dispatchEvent('controlclick');
};

// shift of control position
proto.shiftPosition = function (position) {
  $(this.element).css(hWhere, `${position}px`);
};

// layout handler
proto.layout = function (map) {
  if (map) {
    const position = this.getPosition();
    const element = $(this.element);
    layout({ map, position, element });
  }
};

// change layout of controls // overwrite to customize beahviour
proto.changelayout = function (map) {};

// called when a control is added ore removed to map (added: map is an ol.Map instance , removed map is null)
proto.setMap = function (map) {
  if (map) {
    this.layout(map);
    ol.control.Control.prototype.setMap.call(this, map);
  }
};
/**
 *
 */
proto.showControl = function () {
  $(this.element).show();
};

// hide control and move all controls that sit on his right position
proto.hideControl = function () {
  let position = $(this.element).position().left;
  let controlWidth = $(this.element).outerWidth();
  let newPosition = position;
  const controls = $(this.element).siblings('.ol-control-tl');
  controls.each(function () {
    if ($(this).position().left > position) {
      newPosition = $(this).position().left;
      if (controlWidth > $(this).outerWidth()) {
        position += (controlWidth - $(this).outerWidth());
      }
      $(this).css('left', `${position}px`);
      position = newPosition;
      controlWidth = $(this).outerWidth();
    }
  });
  $(this.element).hide();
};

proto.setEnable = function (enabled, toggled = false) {
  const controlButton = $(this.element).find('button').first();
  if (enabled) controlButton.removeClass('g3w-ol-disabled');
  else {
    controlButton.addClass('g3w-ol-disabled');
    this._interaction && this._interaction.setActive(false);
  }
  this.toggle && this.toggle(toggled);
  this._enabled = enabled;
};

proto.getEnable = function () {
  return this._enabled;
};

proto.setVisible = function (visible = true) {
  this._visible = visible;
  $(this.element)[visible ? 'show' : 'hide']();
};

proto.isVisible = function () {
  return this._visible;
};

proto._postRender = function () {};

module.exports = Control;
