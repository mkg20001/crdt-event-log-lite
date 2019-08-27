'use strict'

module.exports = () => {
  const DB = {}

  return (chainId) => {
    if (!DB[chainId]) {
      DB[chainId] = {}
    }

    let db = DB[chainId]

    return {
      put: (entryId, entryValue) => {
        db[entryId] = entryValue
        return true
      },
      putJSON: (entryId, entryValue) => {
        db[entryId] = entryValue
        return true
      },
      get: (entryId, def) => { // TODO: should this throw if entry doesn't exist
        return db[entryId] === undefined ? def : db[entryId]
      },
      getJSON: (entryId, def) => { // TODO: should this throw if entry doesn't exist
        return db[entryId] === undefined ? def : db[entryId]
      },
      del: (entryId) => { // TODO: should this throw if entry doesn't exist
        delete db[entryId]
      },
      delDb: () => {
        db = DB[chainId] = null
      }
    }
  }
}
