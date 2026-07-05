export function toPostgisPoint(longitude: number, latitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}
