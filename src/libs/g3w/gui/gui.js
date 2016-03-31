noop = require('g3w/core/utils').noop;

// rappresenta l'interfaccia globale dell'API della GUI. 
// metodi devono essere implementati (definiti) dall'applicazione ospite
function GUI(){
  this.showForm = noop;
  
  toastr.options.positionClass = 'toast-top-center';
  // proxy della libreria toastr
  this.notify = toastr;
}

module.exports = new GUI;
