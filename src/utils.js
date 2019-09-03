'use strict'

const {DatabaseType, CollabrationType} = require('./proto')

const databases = {
  [DatabaseType.FLATDB]: require('./payloadLayer/flatObjectDB')
}

module.exports = {
  makeDatabases: async (chainId, storageController, treeProcessor, isOwner, dbConfig) => {
    const dbs = await Promise.all(dbConfig.map(async (db) => {
      const fullId = chainId + '@' + db.id
      const type = databases[db.database]

      switch (db.collabrate) {
        case CollabrationType.NONE: {
          const storage = await storageController(fullId)
          db.db = await type({ storage, tree: treeProcessor })
          db.process = async (actorB58, payload) => {
            return db.db.onPayload(payload)
          }
          break
        }
        case CollabrationType.SIMPLE: {
          let cache = {}
          db.db = async (actorB58) => {
            if (cache[actorB58]) return cache[actorB58]

            const storage = await storageController(fullId + '~' + actorB58)
            return (cache[actorB58] = type({ storage, tree: treeProcessor }))
          }
          db.process = async (actorB58, payload) => {
            const _db = await db.db(actorB58)
            return _db.onPayload(payload)
          }
          break
        }
        default: throw new TypeError('No collabration type ' + db.collabrate)
      }
    }))

    return dbs.reduce((a, b) => {
      a[b.id] = b
      return a
    }, {})
  }
}
