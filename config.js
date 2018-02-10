module.exports = function makeConfig (defaults, custom) {
  const keys = Object.keys(defaults)
  const config = {}

  for (const key of keys) {
    if (key in process.env) config[key] = process.env[key]
    if (custom && key in custom) config[key] = custom[key]
    config[key] = defaults[key]
  }

  return config
}
