import TestRelations from './relations/test';
import TestLayers from './layers/test';
import TestQuery from './queries/querytest';
import TestSearches from './searches/test';
const Project = require('core/project/project');

export default function TestProject({project, plugins, config={}, mapcontrols=[]}={}){
  describe('Project', function(){
    const id = project.getId();
    const searches = project.getSearches();
    it(`Project[${id}]: is instance of Project`, function() {
      assert.instanceOf(project, Project);
    });
    describe(`Project[${id}]: layers`, function(){
      TestLayers({
        projectId: id,
        layers: project.getLayers(),
        config: config.layers
      });
    })
    describe(`Project[${id}]: relations`, function(){
      TestRelations({
        projectId: id,
        relations: project.getRelations(),
        config: config.relations
      });
    })
    describe(`Project[${id}]: queries`, function(){
      TestQuery({
        config: config.queries,
        mapcontrols
      })
    })

    describe(`Project[${id}]: searches`, function(){
      TestSearches({
        projectId: id,
        config: config.searches,
        searches
      })
    })
  })
}