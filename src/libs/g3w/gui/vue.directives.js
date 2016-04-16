Vue.directive("disabled",function(value){
    if (value){
      this.el.setAttribute('disabled','disabled');
    }
    else {
      this.el.removeAttribute('disabled');
    }
  }
);

Vue.directive("selected-first",function(value){
    if (value==0){
      this.el.setAttribute('selected','');
    }
    else {
      this.el.removeAttribute('selected');
    }
  }
);
