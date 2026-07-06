// memoize a pure function

import { refsEqual } from "./equal";

// only the result of the most recent call is memoized.
export function memoize<I,O>(
  callback: (arg: I) => O,
  isEqual: (prev: I, next: I) => boolean = refsEqual,
) {
  let prevInput: I;
  let cachedResult: O;

  return function(input: I) {
    if (prevInput === undefined || !isEqual(prevInput, input)) {
      cachedResult = callback(input);
      prevInput = input;
    }
    return cachedResult;
  }
}
