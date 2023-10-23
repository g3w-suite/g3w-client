export function htmlescape(string) {
  string = string.replace("&", "&amp;");
  string = string.replace("<", "&lt;");
  string = string.replace(">", "&gt;");
  string = string.replace('"', "&quot;");
  return string;
};