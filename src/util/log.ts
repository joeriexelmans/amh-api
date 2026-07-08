import {inspect} from 'node:util';

// pretty-format js values
export function deepInspect(anything: any, enableColors=true): string {
  return inspect(anything, false, null, enableColors);
}

// log to stderr
export function deepLog(anything: any, enableColors=true) {
  Bun.write(Bun.stderr, deepInspect(anything, enableColors) + '\n');
}
