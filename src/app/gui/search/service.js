import QueryBuilderService from 'gui/querybuilder/service';
import ProjectsRegistry from 'core/project/projectsregistry';
import G3WObject from 'core/g3wobject';
import SearchPanel from 'gui/search/vue/panel/searchpanel';

class Service extends G3WObject {
  constructor() {
    super();
    const currentProjectState = ProjectsRegistry.getCurrentProject().state;
    this.title = currentProjectState.search_title || 'search';
    this.init = function (searchesObject) {
      this.state.searches = searchesObject || currentProjectState.search;
    };
    this.state = {
      searches: [],
      searchtools: [],
      querybuildersearches: QueryBuilderService.getCurrentProjectItems(),
    };
  }

  removeItem({ type, index } = {}) {
    switch (type) {
      case 'querybuilder':
        this.state.querybuildersearches.splice(index, 1);
        break;
    }
  }

  getTitle() {
    return this.title;
  }

  showPanel(config = {}) {
    const panel = new SearchPanel(config);
    panel.show();
    return panel;
  }

  cleanSearchPanels() {
    this.state.panels = {};
  }

  stop() {
    const d = $.Deferred();
    d.resolve();
    return d.promise();
  }

  addTool(searchTool) {
    this.state.searchtools.push(searchTool);
  }

  addTools(searchTools) {
    for (const searchTool of searchTools) {
      this.addTool(searchTool);
    }
  }

  addQueryBuilderSearch(querybuildersearch) {
    this.state.querybuildersearches.push(querybuildersearch);
  }

  removeTool(searchTool) {}

  removeTools() {
    this.state.searchtools.splice(0);
  }

  reload() {
    this.state.searches = ProjectsRegistry.getCurrentProject().state.search;
    this.state.querybuildersearches = QueryBuilderService.getCurrentProjectItems();
  }
}

export default Service;
