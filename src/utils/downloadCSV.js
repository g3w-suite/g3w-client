import { getUniqueDomId } from './getUniqueDomId';

export function downloadCSV({
  filename = getUniqueDomId(),
  items = [],
} = {}) {
  function convertToCSV(items) {
    let str = '';
    for (let i = 0; i < items.length; i++) {
      let line = '';
      for (let index in items[i]) {
        if (line !== '') line += ';';
        line += items[i][index];
      }
      str += line + '\r\n';
    }
    return str;
  }
  const exportedFilename = `${filename}.csv`;
  const csv              = convertToCSV(items);
  const blob             = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, exportedFilename);
  } else {
    const link = document.createElement("a");
    if (undefined !== link.download) {
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilename);
      link.style.visibility = 'hidden';
      link.click();
    }
  }
};