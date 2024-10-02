import GUI from 'services/gui';

export function init(){
  const metadataComponent = GUI.getComponent('metadata');
  const service = metadataComponent.getService();
}