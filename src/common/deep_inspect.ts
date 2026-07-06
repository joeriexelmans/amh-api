import {inspect} from 'node:util';

export function deepInspect(anything: any) {
  return inspect(anything, false, null, true);
}

export function deepLog(anything: any) {
  console.log(deepInspect(anything));
}
