const geom = {
  distance(c1,c2){
    return Math.sqrt(geom.squaredDistance(c1,c2));
  },
  squaredDistance(c1,c2){
    const x1 = c1[0];
    const y1 = c1[1];
    const x2 = c2[0];
    const y2 = c2[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },
  closestOnSegment(coordinate, segment) {
    const x0 = coordinate[0];
    const y0 = coordinate[1];
    const start = segment[0];
    const end = segment[1];
    const x1 = start[0];
    const y1 = start[1];
    const x2 = end[0];
    const y2 = end[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const along = (dx === 0 && dy === 0) ? 0 :
        ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);
    let x, y;
    if (along <= 0) {
      x = x1;
      y = y1;
    } else if (along >= 1) {
      x = x2;
      y = y2;
    } else {
      x = x1 + along * dx;
      y = y1 + along * dy;
    }
    return [x, y];
  }
};

export default  geom;
