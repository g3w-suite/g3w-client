import QueryBuilderService from 'services/querybuilder';
import ProjectsRegistry from 'store/projects';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');
const SearchPanel = require('gui/search/vue/panel/searchpanel');

function Service() {
  base(this);
  const currentProjectState = ProjectsRegistry.getCurrentProject().state;
  this.title = currentProjectState.search_title || "search";
  this.init = function(searchesObject) {
    this.state.searches = searchesObject || currentProjectState.search;
  };
  this.state = {
    searches: [],
    searchtools: [],
    querybuildersearches: QueryBuilderService.getCurrentProjectItems()
  };
}

inherit(Service, G3WObject);

const proto = Service.prototype;

proto.removeItem = function({type, index}={}){
  switch(type) {
    case 'querybuilder':
      this.state.querybuildersearches.splice(index, 1);
      break;
  }
};

proto.getTitle = function() {
  return this.title;
};

proto.showPanel = function(config={}) {
  const panel = new SearchPanel(config);
  panel.show();
  return panel;
};

proto.cleanSearchPanels = function() {
  this.state.panels = {};
};

proto.stop = function(){
  const d = $.Deferred();
  d.resolve();
  return d.promise();
};

proto.addTool = function(searchTool) {
  this.state.searchtools.push(searchTool);
};

proto.addTools = function(searchTools) {
  for (const searchTool of searchTools) {
    this.addTool(searchTool);
  }
};

proto.addQueryBuilderSearch = function(querybuildersearch){
  this.state.querybuildersearches.push(querybuildersearch);
};

proto.removeTool = function(searchTool) {};

proto.removeTools = function() {
  this.state.searchtools.splice(0)
};

proto.reload = function() {
  this.state.searches = ProjectsRegistry.getCurrentProject().state.search;
  this.state.querybuildersearches = QueryBuilderService.getCurrentProjectItems();
};


module.exports = Service;
