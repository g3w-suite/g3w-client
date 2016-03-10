var layout = require('layout/layout.js');
var app = new Vue({
    el: "body",
    ready: function(){
        layout.setup();
    }
})

module.exports = app;
