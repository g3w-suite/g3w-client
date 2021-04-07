const Control = require('./control');
function OnClickControl(options = {}) {
  this._originalonlick = null;
  this._onclick = options.onclick;
  Control.call(this, options);
}

ol.inherits(OnClickControl, Control);

const proto = OnClickControl.prototype;

proto.overwriteOnClickEvent = function(clickHandler){
  this._originalonlick = this._originalonlick || this._onclick;
  this._onclick = clickHandler;
};

proto.resetOriginalOnClickEvent = function(){
  this._onclick = this._originalonlick;
  this._originalonlick = null;
};

proto.setMap = function(map) {
  Control.prototype.setMap.call(this,map);
  const controlElement = $(this.element);
  const buttonControl = controlElement.children('button');
  let cliccked = false;
  controlElement.on('click', async ()  => {
    if (!cliccked) {
      cliccked = true;
      buttonControl.addClass('g3w-ol-disabled');
      this._onclick && await this._onclick();
      buttonControl.removeClass('g3w-ol-disabled');
      cliccked = false;
    }
  })
};

module.exports = OnClickControl;
