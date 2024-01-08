export function copyUrl(url) {
  const tempinput = document.createElement('input');
  document.body.appendChild(tempinput);
  tempinput.value = url;
  tempinput.select();
  document.execCommand('copy');
  document.body.removeChild(tempinput);
};