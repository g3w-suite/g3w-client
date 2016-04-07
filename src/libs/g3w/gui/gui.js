noop = require('g3w/core/utils').noop;
var inherit = require('g3w/core/utils').inherit;
var G3WObject = require('g3w/core/g3wobject');

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
// l'app ospite dovrebbe chiamare anche la funzione GUI.ready() quando la UI è pronta
function GUI(){
  // url delle risorse
  this.getResourcesUrl = noop;
  // show an HTML form
  this.showForm = noop;
  // show a Vue instance form
  this.showVMForm = noop
  this.showPanel = noop;
  
  this.ready = function(){
    this.emit('guiready');
  }
  
  toastr.options.positionClass = 'toast-top-center';
  // proxy della libreria toastr
  this.notify = toastr;
}
inherit(GUI,G3WObject);

module.exports = new GUI;
