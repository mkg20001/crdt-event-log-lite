'use strict'

const {Event, Action, SignedEvent} = require('./proto')

async function Tree ({actorKey, isOwner, storage, rpcController, payloadLayer}) {
  const payloadProcessor = await payloadLayer({isOwner, storage})

  const isOnline = Boolean(rpcController)

  const chainState = await storage.getJSON('_chainState')

  async function verifyEvent (data) {
    const {actor, event, signature} = SignedEvent.decode(data)
    const eventData = Event.encode(event)

    if (actor !== actorKey.id.toB58String()) {
      throw new Error('Multi-actor chain not supported yet!')
    }

    const sigIsOk = await actorKey.verify(eventData, signature)
    if (!sigIsOk) {
      throw new Error('Signature is bad')
    }
  }

  /* if (isOnline) {
    rpcController.subscribe(id, {
      fetch: async (id) => id.startsWith('_') ? null : storage.get(id),
      process: async (data) => { // we get new blocks via pubsub or rpc

      }
    })
  } */
}
