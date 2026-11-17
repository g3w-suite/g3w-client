const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Then } = require('@cucumber/cucumber');

async function openAnnotations(page) {
  await page.locator('.cookie-button').click();
  await page.locator('.ol-annotation button').click();
  await page.locator('.usermessage-tool').waitFor({ state: 'visible' });
}

function action(tool, title) {
  return tool.locator(`button:is([title="${title}"], [data-i18n-title="${title}"])`);
}

Then('native annotation controls draw edit export and remove a map point', async function () {
  const page = this.corePage;
  await openAnnotations(page);
  const tool = page.locator('.usermessage-tool');
  await tool.locator('input[title="Point"]').click();
  const point = await page.evaluate(() => {
    const map = g3w.app.getMap();
    const rect = map.getViewport().getBoundingClientRect();
    const x = rect.left + rect.width * 0.8, y = rect.top + rect.height * 0.55;
    return { x, y, coordinate: map.getEventCoordinate(new MouseEvent('click', { clientX: x, clientY: y })) };
  });
  await page.mouse.click(point.x, point.y);
  await tool.locator('input[type="text"]').fill('Station note');
  await tool.locator('input[name="radius"]').fill('12');
  await tool.locator('input[name="feature-text"]').check();
  await tool.locator('input[name="feature-info"]').check();
  const drawn = await page.evaluate(() => {
    const control = g3w.app.getMapControl('annotation');
    const feature = control._annotation.feature;
    return { type: feature.get('type'), text: feature.get('text'), style: feature.get('style'),
      coordinate: feature.getGeometry().getCoordinates(), showText: feature.get('show_text'), showInfo: feature.get('show_info') };
  });
  assert.equal(drawn.type, 'Point');
  assert.equal(drawn.text, 'Station note');
  assert.equal(drawn.style.radius, 12);
  assert.equal(drawn.showText, true);
  assert.equal(drawn.showInfo, true);
  drawn.coordinate.forEach((value, i) => assert.ok(Math.abs(value - point.coordinate[i]) < 1e-6));
  const [download] = await Promise.all([
    page.waitForEvent('download'), action(tool, 'Export').click(),
  ]);
  assert.equal(download.suggestedFilename(), 'annotation.json');
  const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(exported.features.length, 1);
  assert.equal(exported.features[0].properties.text, 'Station note');
  assert.equal(exported.features[0].geometry.type, 'Point');
  const expected = await page.evaluate(coordinate => ol.proj.toLonLat(coordinate), point.coordinate);
  exported.features[0].geometry.coordinates.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-8));
  await action(tool, 'Show All').click();
  await action(tool, 'Show/Hide').click();
  assert.equal(await page.evaluate(() => g3w.app.getMapControl('annotation')._annotation.layer.getVisible()), false);
  await action(tool, 'Show/Hide').click();
  await tool.getByRole('button', { name: 'Station note', exact: true }).click();
  assert.equal(await page.evaluate(() => g3w.app.getMapControl('annotation')._annotation.feature.get('text')), 'Station note');
  await action(tool, 'Show All').click();
  await action(tool, 'Remove').click();
  assert.equal(await page.evaluate(() => g3w.app.getMapControl('annotation')._annotation.layer.getSource().getFeatures().length), 0);
  await action(tool, 'close').click();
  await tool.waitFor({ state: 'detached' });
});

Then('the annotation import dialog projects saved shapes and supplies print entries', async function () {
  const page = this.corePage;
  await openAnnotations(page);
  const tool = page.locator('.usermessage-tool');
  await action(tool, 'Import').click();
  const polygon = { type: 'Polygon', coordinates: [[[1, 2], [1.01, 2], [1.01, 2.01], [1, 2.01], [1, 2]]] };
  const features = [
    ['Point', { type: 'Point', coordinates: [1, 2] }],
    ['LineString', { type: 'LineString', coordinates: [[1, 2], [1.01, 2.01]] }],
    ['Polygon', polygon], ['Rectangle', polygon],
    ['Circle', { type: 'Point', coordinates: [1, 2] }],
    ['Text', { type: 'Point', coordinates: [1, 2] }],
  ].map(([type, geometry], index) => ({
    type: 'Feature', id: index + 10, geometry,
    properties: {
      type, text: `Saved ${type}`, pid: 1, show_text: true, show_info: false,
      style: { color: 'rgb(244, 78, 59)', radius: 8, width: 3, fontsize: 15, opacity: 0.5, rotation: 0, direction: null },
      ...(type === 'Circle' ? { center: [1, 2], endCoordinates: [1.01, 2], radius: 100 } : {}),
    },
  }));
  await page.locator('#file_input').setInputFiles({
    name: 'annotations.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ type: 'FeatureCollection', features })),
  });
  assert.match(await page.locator('#file_preview').textContent(), /Saved Polygon/);
  await page.locator('#confirm_button').click();
  await page.waitForFunction(() => g3w.app.getMapControl('annotation')._annotation.layer.getSource().getFeatures().length === 6);
  const result = await page.evaluate(async () => {
    const control = g3w.app.getMapControl('annotation');
    const shapes = control._annotation.layer.getSource().getFeatures();
    g3w.app.getMap().getView().fit(control._annotation.layer.getSource().getExtent());
    g3w.app.getMap().renderSync();
    const print = await g3w.app.getPrintParams({});
    const printed = JSON.parse(print.ANNOTATIONS).features;
    return {
      types: shapes.map(feature => feature.get('type')).sort(),
      circle: shapes.find(feature => feature.get('type') === 'Circle').getGeometry().getType(),
      coordinate: ol.proj.toLonLat(shapes.find(feature => feature.get('type') === 'Point').getGeometry().getCoordinates()),
      printTypes: printed.map(feature => feature.properties.type).sort(),
      printLabels: printed.filter(feature => feature.properties.type !== 'Point').map(feature => feature.properties.label).sort(),
    };
  });
  assert.deepEqual(result.types, ['Circle', 'LineString', 'Point', 'Polygon', 'Rectangle', 'Text']);
  assert.equal(result.circle, 'Circle');
  assert.ok(Math.abs(result.coordinate[0] - 1) < 1e-8);
  assert.ok(Math.abs(result.coordinate[1] - 2) < 1e-8);
  assert.deepEqual(result.printTypes, result.types);
  assert.deepEqual(result.printLabels, ['Saved Circle', 'Saved LineString', 'Saved Polygon', 'Saved Rectangle', 'Saved Text']);
  await action(tool, 'close').click();
  await tool.waitFor({ state: 'detached' });
});
