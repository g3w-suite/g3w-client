_gis3wlib._control.prototype.centerControl = (function(){

    var centerControl = function(controlOpts) {


            var options = controlOpts || {};

            ol.control.Control.call(this, {
                        element: options.element,
                        target: options.target
            });


     };

    ol.inherits(centerControl, ol.control.Control);

    return centerControl;

})();
