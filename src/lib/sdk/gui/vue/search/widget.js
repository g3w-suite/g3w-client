var inherit = require('core/utils').inherit;
var resolve = require('core/utils').resolve;
var reject = require('core/utils').reject;
var ProjectsRegistry = require('core/projectsregistry');
var GUI = require('gui/gui');
var G3WWidget = require('core/widget');

var SearchPanel = require('./searchpanel');

function SearchWidget() {
  self = this;
  this.name = "search";
  this.elements = [];

  this.init = function(config, service){
    _.forEach(config, function(element){
      self.elements.push(element);
    })
    return resolve();
  };
  //metodo messo come esempio da plugin iternet
  this.showSearchFormPanel = function(){
    var panel = new SearchPanel();
    GUI.showPanel(panel);
  };
}
inherit(SearchWidget,G3WWidget);

module.exports = new SearchWidget
