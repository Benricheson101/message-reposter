const { readFileSync } = require('fs')
const { safeLoad } = require('js-yaml')

/**
 * parsed bot configuration
 * @typedef {Object} config
 */

/**
 * parse yaml config and check that all required elements are present
 * @param {string} path - path to the config file
 * @param {string[]} required - required config elements
 * @return {Object | undefined} - parsed config
 */
function parseConfig (
  path,
  required = ['token', 'proxy_channel', 'proxy']
) {
  const conf = readFileSync(path, { encoding: 'utf-8' })
  const parsed = safeLoad(conf)
  const missing = []

  for (const req of required) {
    if (!(req in parsed)) {
      missing.push(req)
    }
  }

  if (missing.length) {
    throw new Error('Config has missing elements: ' + missing.join(', '))
  }

  return parsed
}

module.exports = { parseConfig }
