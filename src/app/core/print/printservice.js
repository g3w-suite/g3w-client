import G3WObject from 'core/g3wobject';
import PrinterProviderFactory  from 'core/print/providers/printerproviderfactory';

class PrintService extends G3WObject{
  constructor(options={}) {
    super();
    const {type='QGIS'} = options;
    this.provider = PrinterProviderFactory.get(type);
  }

  print(options={}, method="GET") {
    return this.provider.print(options, method);
  };

  printAtlas(options={}, method="GET") {
    return this.provider.printAtlas(options, method);
  };
}

export default  PrintService;
