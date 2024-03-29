'use strict'

const {DatabaseType, CollabrationType, PermissionType} = require('./proto')

const databases = {
  [DatabaseType.FLATDB]: require('./payloadLayer/flatObjectDB')
}

const prom = (f) => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))
const zlib = require('zlib')

module.exports = {
  c: { // TODO: study which is best, use multicodec once added in table
    compressGZIP: async (buffer) => {
      return prom(cb => zlib.gzip(buffer, cb))
    },
    uncompressGZIP: async (buffer) => {
      return prom(cb => zlib.gunzip(buffer, cb))
    }
  },
  makeDatabases: async (chainId, storageController, treeProcessor, ownerB58, isOwner, dbConfig) => {
    const dbs = await Promise.all(dbConfig.map(async (db) => {
      const fullId = chainId + '@' + db.id
      const type = databases[db.database]

      const tree = treeProcessor.onDatabase(db.id, db)

      switch (db.permission) {
        case PermissionType.OWNER: {
          db.canWrite = () => isOwner
          break
        }
        case PermissionType.ANYONE: {
          db.canWrite = (actorB58) => actorB58 === ownerB58
          break
        }
        case PermissionType.PRESPECIFIED: {
          // TODO: add
          break
        }
        default: throw new TypeError('No permission type ' + db.permission)
      }

      switch (db.collabrate) {
        case CollabrationType.NONE: {
          let cache

          db.db = async () => {
            if (cache) return cache
            const storage = await storageController(fullId)
            return (cache = await type({ storage, tree }))
          }

          db.process = async (actorB58, payload) => {
            const _db = await db.db()
            return _db.onPayload(actorB58, payload)
          }

          db.interface = async () => {
            const _db = await db.db()
            return {
              read: _db.public.read,
              write: db.canWrite() ? _db.public.write : null
            }
          }
          break
        }
        case CollabrationType.SIMPLE: {
          let cache = {}

          db.db = async (actorB58) => {
            if (!actorB58) {
              throw new Error('Need b58 id! (dbType=collab.simple)')
            }

            if (cache[actorB58]) return cache[actorB58]

            const storage = await storageController(fullId + '~' + actorB58)
            return (cache[actorB58] = type({ storage, tree }))
          }

          db.process = async (actorB58, payload) => {
            const _db = await db.db(actorB58)
            return _db.onPayload(actorB58, payload)
          }

          db.interface = async (actorB58) => {
            const _db = await db.db(actorB58)
            return {
              read: _db.public.read,
              write: db.canWrite(actorB58) ? _db.public.write : null
            }
          }
          break
        }
        default: throw new TypeError('No collabration type ' + db.collabrate)
      }

      return db
    }))

    return dbs.reduce((a, b) => {
      a[b.id] = b
      return a
    }, {})
  }
}
