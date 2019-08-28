'use strict'

const debug = require('debug')

module.exports = function singleQueue (id) {
  if (!id) {
    id = String(Math.random()).replace(/[^1-9]/gmi, '').substr(1, 6)
  }
  const log = debug('crdt-event-log-lite:queue#' + id)

  let items = []
  let executing = false

  async function exec () {
    if (items[0]) {
      executing = true
      let fnc = items.pop()
      log('exec queue left=%o', items.length)
      await fnc()
      log('exec queue end')
      exec()
    } else {
      executing = false
    }
  }

  function add (fnc) {
    return new Promise((resolve, reject) => {
      items.unshift(async () => {
        try {
          resolve(await fnc())
        } catch (err) {
          log(err)
          reject(err)
        }
      })

      if (!executing) {
        exec()
      }
    })
  }

  return add
}
