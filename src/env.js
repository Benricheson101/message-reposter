import {safeLoad} from 'js-yaml';
import {readFileSync} from 'fs';

/**
 * parsed bot configuration
 * @typedef {Object} config
 */

/**
 * parse yaml config and check that all required elements are present
 * @param {string} path - path to the config file
 * @param {string[]} required - required config elements
 * @return {Object} - parsed config
 */
export function parseConfig(
    path,
    required = ['token'],
) {
  try {
    const conf = readFileSync(path, {encoding: 'utf-8'});

    const parsed = safeLoad(conf);

    console.log(parsed);
  } catch (err) {
    throw err;
  }

  return {};
}
