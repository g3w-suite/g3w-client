export function imageToDataURL({
  src,
  type     = 'image/jpeg',
  callback = () => {},
}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = function() {
      const canvas  = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = this.naturalHeight;
      canvas.width  = this.naturalWidth;
      context.drawImage(this, 0, 0);
      const dataURL = canvas.toDataURL(type);
      callback(dataURL);
      resolve(dataURL);
    };
    image.onerror = reject;
    image.src = src;
  });
}