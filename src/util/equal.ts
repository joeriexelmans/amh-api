export function refsEqual(a: any, b: any) {
  return a === b;
}

export function arraysEqual<T>(a: T[], b: T[], isEqual = refsEqual) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i=0; i<a.length; i++) {
    if (!isEqual(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
