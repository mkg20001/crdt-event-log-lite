'use strict'

module.exports = async () => {
  const databases = {}
  let controller

  return {
    onPayload: async (actionId, actorB58, dbId, payload) => {
      const db = databases[dbId]
      return db.process(actorB58, payload)
    },
    onDatabase: (dbId, db) => {
      databases[dbId] = db

      return {
        onAppend: async (payload) => {
          return controller.append(dbId, payload)
        }
      }
    },
    onController: (_controller) => {
      controller = _controller
    }
  }
}
