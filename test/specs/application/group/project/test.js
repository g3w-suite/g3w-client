import TestRelations from './relations/test';
import TestLayers from './layers/test';
import TestQuery from './queries/querytest';
import TestSearches from './searches/test';
const Project = require('core/project/project');

export default function TestProject({project, plugins, config={}, mapcontrols=[]}={}){
  describe('Project', function(){
    const id = project.getId();
    it(`Project[${id}]: is instance of Project`, function() {
      assert.instanceOf(project, Project);
    });
    if (Object.keys(config.layers).length)
      describe(`Project[${id}]: layers`, function(){
        TestLayers({
          projectId: id,
          layers: project.getLayers(),
          config: config.layers
        });
      })
    if (Object.keys(config.relations).length)
      describe(`Project[${id}]: relations`, function(){
        TestRelations({
          projectId: id,
          relations: project.getRelations(),
          config: config.relations
        });
      })
    if (Object.keys(config.queries).length)
      describe(`Project[${id}]: queries`, function(){
        TestQuery({
          config: config.queries,
          mapcontrols
        })
      })
    if (Object.keys(config.searches).length) {
      const searches = project.getSearches();
      describe(`Project[${id}]: searches`, function(){
        TestSearches({
          projectId: id,
          config: config.searches,
          searches
        })
      })
    }
  })
}