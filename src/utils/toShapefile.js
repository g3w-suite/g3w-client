/**
 * Export a GeoJSON FeatureCollection as Shapefile sidecars packaged in a ZIP Blob.
 *
 * Supports Point, MultiPoint, LineString, MultiLineString, Polygon and MultiPolygon.
 * MultiLineString features share the line set; MultiPolygon features share the polygon set.
 * Unsupported geometry types and empty geometries are skipped. Only finite X/Y are written;
 * Z is discarded and coordinates are never reprojected.
 *
 * DBF columns are inferred from scalar properties. Null and object values do not contribute
 * to the schema; mixed scalar types become text. Names are normalized to 10 characters,
 * text widths are capped at 254 characters, numeric widths are 18, and decimals are capped at 8.
 *
 * ZIP entries use UTF-8 names and raw DEFLATE when available, otherwise STORE. This is a
 * classic ZIP32 writer, limited to 65,535 entries and 4 GiB.
 *
 * @param {{ type: 'FeatureCollection', features: object[] }} input GeoJSON FeatureCollection.
 * @param {object} [options]
 * @param {string} [options.folder] Folder path inside the ZIP; each generated file is placed under it.
 * @param {string} [options.prj] WKT copied verbatim to each `.prj`; defaults to WGS 84 and does not reproject data.
 * @returns {Promise<Blob>} ZIP archive with MIME type `application/zip`.
 * @throws {TypeError} If the input is not a GeoJSON FeatureCollection.
 * @throws {Error} If a coordinate has a non-finite X or Y value.
 * @throws {RangeError} If the archive exceeds classic ZIP32 limits.
 */
export async function toShapefile(input, options = {}) {
  const features = input?.features;
  if (!Array.isArray(features)) {
    throw new TypeError('Expected a GeoJSON FeatureCollection');
  }

  const files = [];

  // Each SHP set has one shape type; multi-geometries share the matching single-geometry family.
  [
    { name: 'POINT',      geometryTypes: ['Point'] },
    { name: 'MULTIPOINT', geometryTypes: ['MultiPoint'] },
    { name: 'LINE',       geometryTypes: ['LineString', 'MultiLineString'] },
    { name: 'POLYGON',    geometryTypes: ['Polygon', 'MultiPolygon'] },
  ].forEach(group => {
      const groupFeatures = features.filter(feature => group.geometryTypes.includes(feature.geometry?.type));
      if (!groupFeatures.length) {
        return;
      }
      const name = group.name;
      // Copy XY ordinates as supplied; validate them here and ignore any additional ordinates such as Z.
      const records = groupFeatures.map(feature => {
        const { type, coordinates } = feature.geometry;
        let parts = [];
        if ('Point' === type) {
          const [x, y] = coordinates;
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error('Invalid coordinates in GeoJSON');
          }
          parts = [[[x, y]]];
        }
        if ('MultiPoint' === type) {
          parts = [coordinates.map(([x, y]) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              throw new Error('Invalid coordinates in GeoJSON');
            }
            return [x, y];
          })];
        }
        if ('LineString' === type) {
          parts = [coordinates.map(([x, y]) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              throw new Error('Invalid coordinates in GeoJSON');
            }
            return [x, y];
          })];
        }
        if ('MultiLineString' === type || 'Polygon' === type) {
          parts = coordinates.map(path => path.map(([x, y]) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              throw new Error('Invalid coordinates in GeoJSON');
            }
            return [x, y];
          })).filter(path => path.length);
        }
        if ('MultiPolygon' === type) {
          parts = coordinates.flatMap(polygon => polygon.map(path => path.map(([x, y]) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              throw new Error('Invalid coordinates in GeoJSON');
            }
            return [x, y];
          })).filter(path => path.length));
        }
        return { parts, properties: feature.properties || {} };
      }).filter(record => record.parts.length && record.parts.every(part => part.length));
      if (!records.length) {
        return;
      }
      // Shapefile headers store the XY extent; record and file lengths are measured in 16-bit words.
      const shapeExtent = { xmin: Infinity, ymin: Infinity, xmax: -Infinity, ymax: -Infinity };
      records.flatMap(record => record.parts.flat()).forEach(([x, y]) => {
        shapeExtent.xmin = Math.min(shapeExtent.xmin, x);
        shapeExtent.ymin = Math.min(shapeExtent.ymin, y);
        shapeExtent.xmax = Math.max(shapeExtent.xmax, x);
        shapeExtent.ymax = Math.max(shapeExtent.ymax, y);
      });
      // Content sizes are bytes: Point=20, MultiPoint=40+16*n, line/polygon=44+4*parts+16*points.
      const contentLengths = records.map(({ parts }) => {
        if ('POINT' === group.name) {
          return 20;
        }
        if ('MULTIPOINT' === group.name) {
          return 40 + parts[0].length * 16;
        }
        const pointCount = parts.reduce((sum, path) => sum + path.length, 0);
        return 44 + parts.length * 4 + pointCount * 16;
      });
      const shpLength = 100 + contentLengths.reduce((sum, length) => sum + length + 8, 0);
      const shxLength = 100 + records.length * 8;
      const shp = new ArrayBuffer(shpLength);
      const shx = new ArrayBuffer(shxLength);
      const shpView = new DataView(shp);
      const shxView = new DataView(shx);
      [[shpView, shpLength], [shxView, shxLength]].forEach(([view, length]) => {
        view.setInt32(0, 9994);
        view.setInt32(24, length / 2);
        view.setInt32(28, 1000, true);
        view.setInt32(32, ({ POINT: 1, MULTIPOINT: 8, LINE: 3, POLYGON: 5 })[group.name], true);
        view.setFloat64(36, shapeExtent.xmin, true);
        view.setFloat64(44, shapeExtent.ymin, true);
        view.setFloat64(52, shapeExtent.xmax, true);
        view.setFloat64(60, shapeExtent.ymax, true);
      });

      // Write SHP records and matching SHX index entries in feature order.
      let shpOffset = 100;
      let shxOffset = 100;
      records.forEach(({ parts }, index) => {
        const points = parts.flat();
        const bounds = { xmin: Infinity, ymin: Infinity, xmax: -Infinity, ymax: -Infinity };
        points.forEach(([x, y]) => {
          bounds.xmin = Math.min(bounds.xmin, x);
          bounds.ymin = Math.min(bounds.ymin, y);
          bounds.xmax = Math.max(bounds.xmax, x);
          bounds.ymax = Math.max(bounds.ymax, y);
        });
        const contentLength = contentLengths[index];
        const contentWords = contentLength / 2;
        shpView.setInt32(shpOffset, index + 1);
        shpView.setInt32(shpOffset + 4, contentWords);
        shpView.setInt32(shpOffset + 8, ({ POINT: 1, MULTIPOINT: 8, LINE: 3, POLYGON: 5 })[group.name], true);
        shxView.setInt32(shxOffset, shpOffset / 2);
        shxView.setInt32(shxOffset + 4, contentWords);

        if ('POINT' === group.name) {
          shpView.setFloat64(shpOffset + 12, parts[0][0][0], true);
          shpView.setFloat64(shpOffset + 20, parts[0][0][1], true);
        }
        if ('MULTIPOINT' === group.name) {
          shpView.setFloat64(shpOffset + 12, bounds.xmin, true);
          shpView.setFloat64(shpOffset + 20, bounds.ymin, true);
          shpView.setFloat64(shpOffset + 28, bounds.xmax, true);
          shpView.setFloat64(shpOffset + 36, bounds.ymax, true);
          shpView.setInt32(shpOffset + 44, points.length, true);
          points.forEach(([x, y], pointIndex) => {
            shpView.setFloat64(shpOffset + 48 + pointIndex * 16, x, true);
            shpView.setFloat64(shpOffset + 56 + pointIndex * 16, y, true);
          });
        }
        if ('LINE' === group.name || 'POLYGON' === group.name) {
          shpView.setFloat64(shpOffset + 12, bounds.xmin, true);
          shpView.setFloat64(shpOffset + 20, bounds.ymin, true);
          shpView.setFloat64(shpOffset + 28, bounds.xmax, true);
          shpView.setFloat64(shpOffset + 36, bounds.ymax, true);
          shpView.setInt32(shpOffset + 44, parts.length, true);
          shpView.setInt32(shpOffset + 48, points.length, true);
          let pointOffset = 0;
          parts.forEach((path, partIndex) => {
            shpView.setInt32(shpOffset + 52 + partIndex * 4, pointOffset, true);
            pointOffset += path.length;
          });
          points.forEach(([x, y], pointIndex) => {
            const offset = shpOffset + 52 + parts.length * 4 + pointIndex * 16;
            shpView.setFloat64(offset, x, true);
            shpView.setFloat64(offset + 8, y, true);
          });
        }

        shpOffset += contentLength + 8;
        shxOffset += 8;
      });
      const shpBytes = new Uint8Array(shp);
      const shxBytes = new Uint8Array(shx);

      // Infer DBF types as C (text), N (number) or L (logical); mixed scalar types become C.
      // Null and object values do not create columns, though row values are encoded separately.
      const fieldMap = new Map();
      records.forEach(({ properties = {} }) => {
        Object.entries(properties || {}).forEach(([fieldName, value]) => {
          if (null == value || 'object' === typeof value) {
            return;
          }
          let fieldType = 'C';
          if ('boolean' === typeof value) {
            fieldType = 'L';
          }
          if ('number' === typeof value) {
            fieldType = 'N';
          }
          const field = fieldMap.get(fieldName);
          if (!field) {
            fieldMap.set(fieldName, { name: fieldName, type: fieldType, values: [value] });
            return;
          }
          field.values.push(value);
          if (field.type !== fieldType) {
            field.type = 'C';
          }
        });
      });

      // Sanitize field names and make them unique within the DBF 10-character limit.
      const usedNames = new Set();
      const fields = Array.from(fieldMap.values(), field => {
        let fieldName = field.name.replace(/[^a-z\d_]/gi, '_').slice(0, 10) || 'field';
        let suffix = 1;
        while (usedNames.has(fieldName.toLowerCase())) {
          const tail = String(suffix++);
          fieldName = `${field.name.replace(/[^a-z\d_]/gi, '_').slice(0, 10 - tail.length)}${tail}`;
        }
        usedNames.add(fieldName.toLowerCase());
        field.dbfName = fieldName;
        field.size = 18;
        if ('C' === field.type) {
          field.size = Math.min(254, Math.max(1, ...field.values.map(value => String(value).length)));
        }
        if ('L' === field.type) {
          field.size = 1;
        }
        field.decimals = 0;
        if ('N' === field.type) {
          field.decimals = Math.min(8, ...field.values.map(value => (String(value).split('.')[1] || '').length));
        }
        return field;
      });
      const headerLength = 33 + fields.length * 32;
      const recordLength = 1 + fields.reduce((length, field) => length + field.size, 0);
      const dbfBuffer = new ArrayBuffer(headerLength + recordLength * records.length + 1);
      const dbfView = new DataView(dbfBuffer);
      const dbfBytes = new Uint8Array(dbfBuffer);
      const now = new Date();

      // DBF descriptors and rows are fixed-width; 0x0D ends the header and 0x1A ends the file.
      dbfView.setUint8(0, 0x03);
      dbfView.setUint8(1, now.getFullYear() - 1900);
      dbfView.setUint8(2, now.getMonth() + 1);
      dbfView.setUint8(3, now.getDate());
      dbfView.setUint32(4, records.length, true);
      dbfView.setUint16(8, headerLength, true);
      dbfView.setUint16(10, recordLength, true);
      fields.forEach((field, index) => {
        const offset = 32 + index * 32;
        Array.from(field.dbfName).forEach((char, i) => dbfView.setUint8(offset + i, char.charCodeAt(0)));
        dbfView.setUint8(offset + 11, field.type.charCodeAt(0));
        dbfView.setUint8(offset + 16, field.size);
        dbfView.setUint8(offset + 17, field.decimals);
      });
      dbfView.setUint8(headerLength - 1, 0x0D);
      // Logical values use T/F, numbers use inferred decimals, text is clipped/padded, and numeric overflow is '*'.
      records.forEach((feature, index) => {
        let offset = headerLength + index * recordLength;
        dbfView.setUint8(offset++, 0x20);
        fields.forEach(field => {
          const value = feature.properties?.[field.name];
          let encoded = '';
          if ('L' === field.type) {
            encoded = 'F';
            if (value) {
              encoded = 'T';
            }
          }
          if ('N' === field.type && null != value) {
            const number = Number(value).toFixed(field.decimals);
            encoded = number.padStart(field.size, ' ');
            if (number.length > field.size) {
              encoded = '*'.repeat(field.size);
            }
          }
          if ('C' === field.type && null != value) {
            encoded = String(value).slice(0, field.size).padEnd(field.size, ' ');
          }
          Array.from(encoded).forEach((char, i) => dbfBytes[offset + i] = char.charCodeAt(0));
          offset += field.size;
        });
      });
      dbfBytes[dbfBuffer.byteLength - 1] = 0x1A;

      const base = `${name}.`;
      files.push(
        { name: `${base}shp`, data: shpBytes },
        { name: `${base}shx`, data: shxBytes },
        { name: `${base}dbf`, data: dbfBytes },
        { name: `${base}prj`, data: new TextEncoder().encode(options.prj || 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]') },
      );
    });

  // Prefix sidecars with the optional folder and include an explicit directory entry.
  const encoder = new TextEncoder();
  let folderPath = '';
  if (options.folder) {
    folderPath = `${options.folder.replace(/\/+$/, '')}/`;
  }
  const entries = files.map(({ name, data }) => ({ name: encoder.encode(`${folderPath}${name}`), data }));
  if (folderPath) {
    entries.unshift({ name: encoder.encode(folderPath), data: new Uint8Array() });
  }

  // CRC-32 covers each original payload; use raw DEFLATE if supported, otherwise STORE it verbatim.
  const prepared = await Promise.all(entries.map(async entry => {
    let crc = 0xFFFFFFFF;
    entry.data.forEach(byte => {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
    });
    let bytes = entry.data;
    let method = 0;
    if ('function' === typeof CompressionStream) {
      try {
        const stream = new Blob([entry.data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
        method = 8;
      } catch {
        bytes = entry.data;
      }
    }
    return { ...entry, crc: (crc ^ 0xFFFFFFFF) >>> 0, bytes, method };
  }));
  // This writer emits classic ZIP32, which has 16-bit entry counts and 32-bit sizes/offsets.
  if (prepared.length > 0xFFFF) {
    throw new RangeError('ZIP32 supports at most 65535 entries');
  }

  const localSize = prepared.reduce((size, entry) => size + 30 + entry.name.length + entry.bytes.length, 0);
  const centralSize = prepared.reduce((size, entry) => size + 46 + entry.name.length, 0);
  const totalSize = localSize + centralSize + 22;
  if (totalSize > 0xFFFFFFFF) {
    throw new RangeError('ZIP32 archive exceeds 4 GiB');
  }

  const archive = new Uint8Array(totalSize);
  const view = new DataView(archive.buffer);
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let localOffset = 0;
  let centralOffset = localSize;

  // Write UTF-8 local headers and payloads, then central-directory entries and the end record.
  prepared.forEach(entry => {
    const nameLength = entry.name.length;
    const dataLength = entry.bytes.length;
    if (localOffset + 30 + nameLength + dataLength > 0xFFFFFFFF) {
      throw new RangeError('ZIP32 archive exceeds 4 GiB');
    }

    view.setUint32(localOffset, 0x04034B50, true);
    view.setUint16(localOffset + 4, 20, true);
    view.setUint16(localOffset + 6, 0x0800, true);
    view.setUint16(localOffset + 8, entry.method, true);
    view.setUint16(localOffset + 10, dosTime, true);
    view.setUint16(localOffset + 12, dosDate, true);
    view.setUint32(localOffset + 14, entry.crc, true);
    view.setUint32(localOffset + 18, dataLength, true);
    view.setUint32(localOffset + 22, entry.data.length, true);
    view.setUint16(localOffset + 26, nameLength, true);
    view.setUint16(localOffset + 28, 0, true);
    archive.set(entry.name, localOffset + 30);
    archive.set(entry.bytes, localOffset + 30 + nameLength);

    view.setUint32(centralOffset, 0x02014B50, true);
    view.setUint16(centralOffset + 4, 20, true);
    view.setUint16(centralOffset + 6, 20, true);
    view.setUint16(centralOffset + 8, 0x0800, true);
    view.setUint16(centralOffset + 10, entry.method, true);
    view.setUint16(centralOffset + 12, dosTime, true);
    view.setUint16(centralOffset + 14, dosDate, true);
    view.setUint32(centralOffset + 16, entry.crc, true);
    view.setUint32(centralOffset + 20, dataLength, true);
    view.setUint32(centralOffset + 24, entry.data.length, true);
    view.setUint16(centralOffset + 28, nameLength, true);
    view.setUint16(centralOffset + 30, 0, true);
    view.setUint16(centralOffset + 32, 0, true);
    view.setUint16(centralOffset + 34, 0, true);
    view.setUint16(centralOffset + 36, 0, true);
    view.setUint32(centralOffset + 38, entry.name[nameLength - 1] === 47 ? 0x10 : 0, true);
    view.setUint32(centralOffset + 42, localOffset, true);
    archive.set(entry.name, centralOffset + 46);

    localOffset += 30 + nameLength + dataLength;
    centralOffset += 46 + nameLength;
  });

  view.setUint32(centralOffset, 0x06054B50, true);
  view.setUint16(centralOffset + 4, 0, true);
  view.setUint16(centralOffset + 6, 0, true);
  view.setUint16(centralOffset + 8, prepared.length, true);
  view.setUint16(centralOffset + 10, prepared.length, true);
  view.setUint32(centralOffset + 12, centralSize, true);
  view.setUint32(centralOffset + 16, localSize, true);
  view.setUint16(centralOffset + 20, 0, true);

  return new Blob([archive], { type: 'application/zip' });
}
