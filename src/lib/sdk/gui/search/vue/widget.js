var inherit = require('core/utils/utils').inherit;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var ProjectsRegistry = require('core/project/projectsregistry');
var GUI = require('gui/gui');
var G3WWidget = require('core/search/widget');

var SearchPanel = require('./panel/searchpanel');

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
