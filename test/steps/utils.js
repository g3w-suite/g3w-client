const assert = require('node:assert/strict');
const { Then, When } = require('@cucumber/cucumber');

When('I flatten nested profile data', async function () {
  const { flattenObject } = await import('../../src/utils/flattenObject.js');
  this.result = flattenObject({
    user: {
      name: 'Ada',
      location: { city: 'Rome' }
    },
    roles: ['editor', 'admin']
  }, '/');
});

Then('nested property paths are preserved', function () {
  assert.deepEqual(this.result, {
    'user/name': 'Ada',
    'user/location/city': 'Rome',
    'roles/0': 'editor',
    'roles/1': 'admin'
  });
});

When('I group map layers by geometry type', async function () {
  const { groupBy } = await import('../../src/utils/groupBy.js');
  this.result = groupBy([
    { id: 'roads', geometry: 'LineString' },
    { id: 'buildings', geometry: 'Polygon' },
    { id: 'paths', geometry: 'LineString' }
  ], layer => layer.geometry);
});

Then('layers with the same geometry type are grouped together', function () {
  assert.deepEqual(this.result, {
    LineString: [
      { id: 'roads', geometry: 'LineString' },
      { id: 'paths', geometry: 'LineString' }
    ],
    Polygon: [{ id: 'buildings', geometry: 'Polygon' }]
  });
});
