'use strict'

module.exports = async () => {
  const databases = {}

  return {
    onAppend: async () => {

    },
    onPayload: async (actionId, actorB58, dbId, payload) => {
      const db = databases[dbId]
      return db.process(actorB58, payload)
    },
    onDatabase: (dbId, db) => {
      databases[dbId] = db
    }
  }
}
