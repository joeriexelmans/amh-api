
import { refsEqual } from "./equal";

// Given a pure function ('callback') with one parameter, returns a memoizing version of that function: if the function is repeatedly called with the same parameter, the same result will be returned without re-computing the result.
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
