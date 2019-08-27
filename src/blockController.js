'use strict'

async function BlockController (id, {storage, rpcController, tree}) {
  const isOnline = Boolean(rpcController)

  if (isOnline) {
    rpcController.subscribe(id, tree)
  }

  return {
    fetch: async (blockType, blockId) => {
      let hex = blockId.toString('hex')

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
    }
  }
}

module.exports = BlockController
