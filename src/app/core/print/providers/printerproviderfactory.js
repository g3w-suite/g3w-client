import G3WObject from 'core/g3wobject';
import PrinterQGISProvider from './qgis/printerQGISProvider';

const Providers = {
  QGIS: PrinterQGISProvider,
};

class PrinterProviderFactory extends G3WObject {
  constructor() {
    super();
  }

  get(type = 'QGIS') {
    return new Providers[type]();
  }
}

export default new PrinterProviderFactory();
