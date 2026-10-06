import { unzipSync } from 'fflate';
import proj4 from 'proj4';

/**
 * Reads Shapefile data and returns its features as a GeoJSON FeatureCollection.
 *
 * Accepts a ZIP archive as a Blob, ArrayBuffer or Uint8Array, or a sidecar map
 * containing `shp` and optional `dbf`, `prj` and `cpg` entries. Sidecars in a
 * ZIP are grouped by path and basename; features from every SHP dataset are
 * combined in the returned collection.
 *
 * Point, MultiPoint, PolyLine and Polygon records are supported, including
 * their Z/M variants. Output coordinates contain only XY. When a PRJ file is
 * present, coordinates are transformed to EPSG:4326; without one, coordinates
 * are returned unchanged. DBF text uses the CPG encoding, defaulting to 1252;
 * I, B and Y fields are decoded as binary values, N/F as numbers, L as booleans
 * and other field types as text. Deleted DBF rows retain their geometry with
 * empty properties.
 *
 * @param {Blob|ArrayBuffer|Uint8Array|{shp: ArrayBuffer|Uint8Array, dbf?: ArrayBuffer|Uint8Array, prj?: string, cpg?: string}} input
 * @returns {Promise<{type: 'FeatureCollection', features: Array<{type: 'Feature', geometry: Object|null, properties: Object}>}>}
 * @throws {Error} If a ZIP has no SHP file, sidecar input has no SHP data, or a SHP record is invalid or unsupported.
 */
export async function toGeoJSON(input) {
  // Blob inputs are read as bytes; binary inputs are treated as ZIP archives below.
  if (input && 'function' === typeof input.arrayBuffer) {
    input = await input.arrayBuffer();
  }

  // A sidecar map is one dataset; a ZIP expands into one map per SHP file.
  let datasets = [input];
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    // unzipSync expects bytes, regardless of whether the caller supplied a buffer or a view.
    let archiveBytes = input;
    if (archiveBytes instanceof ArrayBuffer) {
      archiveBytes = new Uint8Array(archiveBytes);
    }
    if (!(archiveBytes instanceof Uint8Array)) {
      archiveBytes = new Uint8Array(archiveBytes.buffer, archiveBytes.byteOffset, archiveBytes.byteLength);
    }
    const entries = Object.entries(unzipSync(archiveBytes));
    datasets = [];

    // A ZIP may contain several independent datasets; each SHP is paired only with sibling sidecars.
    for (const [shpPath] of entries) {
      if (!/\.shp$/i.test(shpPath)) {
        continue;
      }
      const base = shpPath.replace(/\.shp$/i, '').toLowerCase();
      const files = {};
      for (const [path, entry] of entries) {
        // Include the directory in the basename so identically named files in other folders do not mix.
        if (path.replace(/\.(shp|dbf|prj|cpg)$/i, '').toLowerCase() !== base) {
          continue;
        }
        const extension = path.split('.').at(-1).toLowerCase();
        let content = entry;
        if (['prj', 'cpg'].includes(extension)) {
          content = new TextDecoder().decode(content);
        }
        files[extension] = content;
      }
      datasets.push(files);
    }
    if (!datasets.length) {
      throw new Error('ZIP archive does not contain a Shapefile');
    }
  }

  const features = [];
  for (const dataset of datasets) {
    const files = {};
    // Sidecar extensions are case-insensitive, as ZIP entry names often are not normalized.
    for (const [extension, content] of Object.entries(dataset || {})) {
      files[extension.toLowerCase()] = content;
    }
    if (!files.shp) {
      throw new Error('Shapefile data is missing');
    }

    // CPG names the DBF text encoding; use the common Windows-1252 default if absent.
    const encoding = String(files.cpg || '1252').trim().toLowerCase();
    let charset = `windows-${encoding.replace(/^windows-/, '')}`;
    if (['utf-8', '65001'].includes(encoding)) {
      charset = 'utf-8';
    }
    // Reuse the same decoder for DBF field names and textual values.
    const textDecoder = new TextDecoder(charset);
    const dbfRows = [];
    if (files.dbf) {
      // Read the DBF schema first, then decode each row according to its field type.
      let dbfBytes = files.dbf;
      if (dbfBytes instanceof ArrayBuffer) {
        dbfBytes = new Uint8Array(dbfBytes);
      }
      if (!(dbfBytes instanceof Uint8Array)) {
        dbfBytes = new Uint8Array(dbfBytes.buffer, dbfBytes.byteOffset, dbfBytes.byteLength);
      }
      const dbfView = new DataView(dbfBytes.buffer, dbfBytes.byteOffset, dbfBytes.byteLength);
      // DBF header offsets 4, 8 and 10 store row count, header size and fixed row size.
      const rowCount = dbfView.getUint32(4, true);
      const headerLength = dbfView.getUint16(8, true);
      const recordLength = dbfView.getUint16(10, true);
      const fields = [];

      // DBF field descriptors are 32 bytes each and terminate with 0x0D.
      for (let fieldOffset = 32; fieldOffset + 32 <= headerLength && dbfBytes[fieldOffset] !== 0x0D; fieldOffset += 32) {
        const nameBytes = dbfBytes.subarray(fieldOffset, fieldOffset + 11);
        const nameEnd = nameBytes.indexOf(0);
        let nameLength = nameBytes.length;
        if (nameEnd >= 0) {
          nameLength = nameEnd;
        }
        // Names are fixed-width C strings; type and width live at offsets 11 and 16.
        fields.push({
          name: textDecoder.decode(nameBytes.subarray(0, nameLength)).trim(),
          type: String.fromCharCode(dbfBytes[fieldOffset + 11]),
          length: dbfBytes[fieldOffset + 16],
        });
      }

      // Keep deleted rows as null so DBF row indexes stay aligned with SHP records.
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        // Rows start after the variable-length header; each row has a deletion byte plus fixed-width fields.
        const rowStart = headerLength + rowIndex * recordLength;
        if (dbfBytes[rowStart] === 0x2A) {
          dbfRows.push(null);
          continue;
        }
        const properties = {};
        // Skip the row deletion marker before reading its first field.
        let fieldOffset = rowStart + 1;
        for (const field of fields) {
          if ('I' === field.type) {
            // I stores a signed little-endian 32-bit integer.
            properties[field.name] = dbfView.getInt32(fieldOffset, true);
            fieldOffset += field.length;
            continue;
          }
          if ('B' === field.type) {
            // B stores an 8-byte little-endian IEEE-754 double.
            const value = dbfView.getFloat64(fieldOffset, true);
            properties[field.name] = Number.isFinite(value) ? value : null;
            fieldOffset += field.length;
            continue;
          }
          if ('Y' === field.type) {
            // Y stores a signed 64-bit integer scaled by 10,000 for currency precision.
            properties[field.name] = Number(dbfView.getBigInt64(fieldOffset, true)) / 10000;
            fieldOffset += field.length;
            continue;
          }
          const value = textDecoder.decode(dbfBytes.subarray(fieldOffset, fieldOffset + field.length)).trim();
          fieldOffset += field.length;
          if (!value) {
            properties[field.name] = null;
            continue;
          }
          if (['N', 'F'].includes(field.type)) {
            // Numeric text may be blank or malformed; represent either case as null.
            const number = Number(value);
            properties[field.name] = Number.isFinite(number) ? number : null;
            continue;
          }
          if ('L' === field.type) {
            // DBF logical values use Y/T for true; other nonblank markers are false.
            properties[field.name] = ['Y', 'y', 'T', 't'].includes(value);
            continue;
          }
          properties[field.name] = value;
        }
        dbfRows.push(properties);
      }
    }

    // DataView needs a byte view with the original offset preserved for sliced buffers.
    let shapeBytes = files.shp;
    if (shapeBytes instanceof ArrayBuffer) {
      shapeBytes = new Uint8Array(shapeBytes);
    }
    if (!(shapeBytes instanceof Uint8Array)) {
      shapeBytes = new Uint8Array(shapeBytes.buffer, shapeBytes.byteOffset, shapeBytes.byteLength);
    }
    const shapeView = new DataView(shapeBytes.buffer, shapeBytes.byteOffset, shapeBytes.byteLength);
    let projection;
    if (files.prj) {
      projection = String(files.prj).trim();
    }
    // PRJ conversion is applied to each XY pair below; extra Z/M ordinates are intentionally discarded.
    // The file header is 100 bytes; record headers use big-endian word lengths, record bodies use little-endian values.
    let shapeOffset = 100;
    let recordIndex = 0;

    while (shapeOffset + 8 <= shapeBytes.byteLength) {
      const recordLength = shapeView.getInt32(shapeOffset + 4, false) * 2;
      const recordStart = shapeOffset + 8;
      const recordEnd = recordStart + recordLength;
      if (recordEnd > shapeBytes.byteLength || recordLength < 4) {
        throw new Error('Invalid Shapefile record');
      }
      const shapeType = shapeView.getInt32(recordStart, true);
      // Null-shape records contain no geometry; their feature still keeps the matching DBF row.
      let geometry = null;

      // Point type codes 1/11/21 are XY/Z/M variants; only the first two ordinates are used.
      if ([1, 11, 21].includes(shapeType)) {
        let coordinates = [shapeView.getFloat64(recordStart + 4, true), shapeView.getFloat64(recordStart + 12, true)];
        if (projection) {
          // Shapefile coordinates use the PRJ source CRS; application imports expect WGS 84.
          coordinates = proj4(projection, 'EPSG:4326', coordinates);
        }
        geometry = { type: 'Point', coordinates };
      }
      // Multipoint records store a count followed by a flat sequence of XY pairs.
      if ([8, 18, 28].includes(shapeType)) {
        // The point count follows the bounding box; coordinate pairs start immediately after it.
        const pointCount = shapeView.getInt32(recordStart + 36, true);
        const coordinates = [];
        for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
          let coordinate = [
            shapeView.getFloat64(recordStart + 40 + pointIndex * 16, true),
            shapeView.getFloat64(recordStart + 48 + pointIndex * 16, true),
          ];
          if (projection) {
            coordinate = proj4(projection, 'EPSG:4326', coordinate);
          }
          coordinates.push(coordinate);
        }
        geometry = { type: 'MultiPoint', coordinates };
      }
      if ([3, 13, 23, 5, 15, 25].includes(shapeType)) {
        const partCount = shapeView.getInt32(recordStart + 36, true);
        const pointCount = shapeView.getInt32(recordStart + 40, true);
        // A bounding box precedes the part indexes, which in turn precede all XY pairs.
        const partsOffset = recordStart + 44;
        const pointsOffset = partsOffset + partCount * 4;
        // Part indexes refer into one flat XY array; a final sentinel bounds the last part.
        const partStarts = [];
        for (let partIndex = 0; partIndex < partCount; partIndex++) {
          partStarts.push(shapeView.getInt32(partsOffset + partIndex * 4, true));
        }
        partStarts.push(pointCount);
        const parts = [];
        for (let partIndex = 0; partIndex < partCount; partIndex++) {
          const part = [];
          for (let pointIndex = partStarts[partIndex]; pointIndex < partStarts[partIndex + 1]; pointIndex++) {
            let coordinate = [
              shapeView.getFloat64(pointsOffset + pointIndex * 16, true),
              shapeView.getFloat64(pointsOffset + pointIndex * 16 + 8, true),
            ];
            if (projection) {
              coordinate = proj4(projection, 'EPSG:4326', coordinate);
            }
            part.push(coordinate);
          }
          parts.push(part);
        }

        if ([3, 13, 23].includes(shapeType)) {
          // One part is a LineString; multiple parts form a MultiLineString.
          geometry = { type: 'LineString', coordinates: parts[0] || [] };
          if (parts.length > 1) {
            geometry = { type: 'MultiLineString', coordinates: parts };
          }
        }
        if ([5, 15, 25].includes(shapeType)) {
          // ESRI winding is clockwise for shells and counter-clockwise for holes.
          const polygons = [];
          const holes = [];
          for (const ring of parts) {
            // A closed ring needs at least three vertices plus its repeated closing coordinate.
            if (ring.length < 4) {
              continue;
            }
            let area = 0;
            // The signed shoelace area separates exterior rings from interior rings.
            for (let pointIndex = 0; pointIndex < ring.length; pointIndex++) {
              const next = ring[(pointIndex + 1) % ring.length];
              area += ring[pointIndex][0] * next[1] - next[0] * ring[pointIndex][1];
            }
            if (area < 0) {
              polygons.push([ring]);
              continue;
            }
            holes.push(ring);
          }
          if (!polygons.length && holes.length) {
            // If every ring has the opposite winding, retain them as exterior rings rather than losing them.
            for (const ring of holes) {
              polygons.push([ring]);
            }
            holes.length = 0;
          }
          for (const hole of holes) {
            let assigned = false;
            // Holes belong to the first exterior ring containing their first coordinate.
            for (const polygon of polygons) {
              const ring = polygon[0];
              const [x, y] = hole[0];
              let inside = false;
              // Ray casting tests whether this hole belongs to the current exterior ring.
              for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const [xi, yi] = ring[i];
                const [xj, yj] = ring[j];
                if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                  inside = !inside;
                }
              }
              if (inside) {
                polygon.push(hole);
                assigned = true;
                break;
              }
            }
            if (!assigned) {
              // Keep an uncontained ring as a standalone polygon instead of dropping its coordinates.
              polygons.push([hole]);
            }
          }
          if (polygons.length > 1) {
            geometry = { type: 'MultiPolygon', coordinates: polygons };
          }
          if (polygons.length <= 1) {
            geometry = { type: 'Polygon', coordinates: polygons[0] || [] };
          }
        }
      }
      if (![0, 1, 8, 11, 18, 21, 28, 3, 13, 23, 5, 15, 25].includes(shapeType)) {
        throw new Error(`Unsupported Shapefile shape type: ${shapeType}`);
      }

      // DBF rows use the same record order; deleted rows deliberately yield empty properties.
      features.push({
        type: 'Feature',
        geometry,
        properties: dbfRows[recordIndex] || {},
      });
      recordIndex++;
      shapeOffset = recordEnd;
    }
  }
  return {
    type: 'FeatureCollection',
    features
  };
}