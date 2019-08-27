'use strict'

module.exports = () => {
  const DB = {}

  return (chainId) => {
    if (!DB[chainId]) {
      DB[chainId] = {}
    }

    let db = DB[chainId]

    return {
      put: (entryId, blockValue) => {
        db[entryId] = blockValue
        return true
      },
      get: (entryId) => { // TODO: should this throw if block doesn't exist
        return db[entryId]
      },
      del: (entryId) => { // TODO: should this throw if block doesn't exist
        delete db[entryId]
      },
      delDb: () => { // TODO

      }
    }
  }
}
