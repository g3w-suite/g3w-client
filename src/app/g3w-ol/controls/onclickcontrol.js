const Control = require('g3w-ol/controls/control');

module.exports = class OnClickControl extends Control {

  constructor(options = {}) {
    super(options);
    this._originalonlick = null;
    this._onclick = options.onclick;
  }

  overwriteOnClickEvent(clickHandler){
    this._originalonlick = this._originalonlick || this._onclick;
    this._onclick = clickHandler;
  };

  resetOriginalOnClickEvent() {
    this._onclick = this._originalonlick || this._onclick;
    this._originalonlick = null;
  }

  setMap(map) {
    Control.prototype.setMap.call(this,map);
    const controlElement = $(this.element);
    const buttonControl = controlElement.children('button');
    let cliccked = false;
    controlElement.on('click', async ()  => {
      if (!cliccked) {
        cliccked = true;
        buttonControl.addClass('g3w-ol-disabled');
        if (this._onclick) {
          await this._onclick();
        }
        buttonControl.removeClass('g3w-ol-disabled');
        cliccked = false;
      }
    })
  }

};
