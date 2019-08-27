'use strict'

const {Event, Action, SignedEvent} = require('./proto')

async function Tree (id, {isOwner, storage, rpcController, payloadLayer}) {
  const payloadProcessor = await payloadLayer({isOwner, storage})

  const lastEventBlock = await storage.get('_latest')
  const isOnline = Boolean(rpcController)

  if (lastEventBlock) {

  }

  /* if (isOnline) {
    rpcController.subscribe(id, {
      fetch: async (id) => id.startsWith('_') ? null : storage.get(id),
      process: async (data) => { // we get new blocks via pubsub or rpc

      }
    })
  } */
}
