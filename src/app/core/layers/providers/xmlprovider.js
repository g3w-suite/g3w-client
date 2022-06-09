import Provider from 'core/layers/providers/provider';

class XMLDataProvider extends Provider {
  constructor(options={}) {
    super(options);
    this._name = 'xml';
  }
  getData() {
    const d = $.Deferred();
    return d.promise();
  };
}

export default XMLDataProvider;
