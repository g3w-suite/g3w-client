Vue.directive("disabled",function(value){
    if (value){
      this.el.setAttribute('disabled','disabled');
    }
    else {
      this.el.removeAttribute('disabled');
    }
  }
);
