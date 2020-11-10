import Service from '../../service';
import TestRelations from './relations/test';
import TestLayers from './layers/test';
import TestQuery from './queries/querytest';
import TestSearches from './searches/test';
import TestCatalog from './catalog/test'
import TestPrint from './print/test'
const Project = require('core/project/project');

export default function TestProject({plugins, testConfig={}, mapcontrols=[]}={}){
  const {gid} = testConfig;
  describe('#Test Project', function() {
    let project;
    before(async ()=> {
      project = await Service.getProject(gid);
    })
    it(`Project[${gid}]: is instance of Project`, function() {
      assert.instanceOf(project, Project);
    });
    it('hook for sub projects test to wait before async ', function() {
      if (Object.keys(testConfig.layers).length)
        TestLayers({
          layers: project.getLayers(),
          testConfig: testConfig.layers
        });
      if (Object.keys(testConfig.relations).length)
        TestRelations({
          relations: project.getRelations(),
          testConfig: testConfig.relations
        });
      if (Object.keys(testConfig.queries).length)
        TestQuery({
          testConfig: testConfig.queries,
          mapcontrols
        })
      if (Object.keys(testConfig.searches).length)
        TestSearches({
          searches: project.getSearches(),
          testConfig: testConfig.searches,
        })
      if (Object.keys(testConfig.catalog).length)
        TestCatalog({
          gid,
          testConfig: testConfig.catalog,
        })
      if (Object.keys(testConfig.print).length)
        TestPrint({
          print: project.getPrint(),
          testConfig: testConfig.print,
        })
    })
  })
}