'use strict'

module.exports = () => {
  const DB = {}

  return (actorId) => {
    if (!DB[actorId]) {
      DB[actorId] = {}
    }

    let db = DB[actorId]

    return {
      put: (blockId, blockValue) => {
        db[blockId] = blockValue
        return true
      },
      get: (blockId) => { // TODO: should this throw if block doesn't exist
        return db[blockId]
      },
      del: (blockId) => { // TODO: should this throw if block doesn't exist
        delete db[blockId]
      },
      delDb: () => { // TODO

      }
    }
  }
}
