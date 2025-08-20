//@since 4.1.0 Map controls
import addlayer      from './addlayer';
import annotation    from './annotation';
import geocoding     from './geocoding';
import geolocation   from './geolocation';
import measure       from './measure';
import mouseposition from './mouseposition';
import overview      from './overview';
import query         from './query';
import queryby       from './queryby';
import scale         from './scale';
import scaleline     from './scaleline';
import screenshot    from './screenshot';
import streetview    from './streetview';
import zoom          from './zoom';
import zoombox       from './zoombox';
import zoomhistory   from './zoomhistory';
import zoomtoextent  from './zoomtoextent';

const CONTROLS = {
	...addlayer,
	...annotation,
	...geocoding,
	...geolocation,
	...measure,
	...mouseposition,
	...overview,
	...query,
	...queryby,
	...scale,
	...scaleline,
	...screenshot,
	...streetview,
	...zoom,
	...zoombox,
	...zoomhistory,
	...zoomtoextent
};

export default function setupControl(type) {
	return CONTROLS[type]();
}