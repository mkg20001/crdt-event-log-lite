'use strict'

async function BlockController (id, {storage, rpcController, tree}) {
  const isOnline = Boolean(rpcController)

  if (isOnline) {
    rpcController.subscribe(tree)
  }

  const unprocessed = {}

  return {
    fetch: async (blockType, blockId) => {
      let hex = blockId.toString('hex')

      if (unprocessed[hex]) {
        const res = unprocessed[hex]
        delete unprocessed[hex]
        return res
      }

      const fromStorage = await storage.get(hex)

      if (fromStorage) {
        return fromStorage
      }

      if (isOnline) {
        return rpcController.blockRequest({
          blockType,
          blockId
        })
      } else {
        throw new Error('Block not found in storage and not online!')
      }
    },
    announce: (eventId, event) => {
      if (rpcController) {
        rpcController.announce(eventId, event)
      }
    },
    addUnprocessed: (id, data) => {
      unprocessed[id] = data
    }
  }
}

module.exports = BlockController
