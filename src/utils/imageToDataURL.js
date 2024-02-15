export function imageToDataURL({
  src,
  type     = 'image/jpeg',
  callback = () => {},
}) {
  const image = new Image();
  image.onload = function() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = this.naturalHeight;
    canvas.width = this.naturalWidth;
    context.drawImage(this, 0, 0);
    const dataURL = canvas.toDataURL(type);
    callback(dataURL);
  };
  image.src = src;
};