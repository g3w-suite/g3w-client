noop = require('g3w/core/utils').noop;

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
function GUI(){
  // show an HTML form
  this.showForm = noop;
  // show a Vue instance form
  this.showVMForm = noop
  
  toastr.options.positionClass = 'toast-top-center';
  // proxy della libreria toastr
  this.notify = toastr;
}

module.exports = new GUI;
