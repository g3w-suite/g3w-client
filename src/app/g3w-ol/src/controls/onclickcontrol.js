import Control  from './control';
class OnClickControl extends Control {
  constructor(options) {
    super(options);
    this._originalonlick = null;
    this._onclick = options.onclick;
  }

  overwriteOnClickEvent(clickHandler){
    this._originalonlick = this._originalonlick || this._onclick;
    this._onclick = clickHandler;
  };

  resetOriginalOnClickEvent(){
    this._onclick = this._originalonlick || this._onclick;
    this._originalonlick = null;
  };

  setMap(map) {
    super.setMap(map);
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
}



export default  OnClickControl;
