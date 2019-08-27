'use strict'

const {Event, Action, SignedEvent} = require('./proto')

const multihash = require('multihash')
const multihashing = require('multihashing-async')
const Id = require('peer-id')

async function Tree ({actorKey, isOwner, storage, rpcController, payloadLayer}) {
  const payloadProcessor = await payloadLayer({isOwner, storage})

  const isOnline = Boolean(rpcController)
  const actorIDB58 = actorKey.id.toB58String()

  const chainState = await storage.getJSON('_chainState')
  const actorState = {}

  async function verifyEvent (eventId, data) {
    const {actorId, event, signature} = SignedEvent.decode(data)
    const eventData = Event.encode(event)

    let hashName

    if (!eventId) { // if we just get raw data
      hashName = event.eventHash // TODO: get hash name from that
      eventId = await multihashing(data, hashName)
    } else {
      hashName = multihash.decode(eventId).name
      let realHash = await multihashing(data, hashName)
      if (!realHash.equals(eventId)) {
        throw new Error('Real hash is not equal to event id')
      }
    }

    if (!actorKey.id.equals(actorId)) {
      throw new Error('Multi-actor chain not supported yet!')
    }

    const sigIsOk = await actorKey.verify(eventData, signature)
    if (!sigIsOk) {
      throw new Error('Signature is bad')
    }

    return processEvent(eventId, data, actorId, event)
  }

  async function processEvent (eventId, data, actorId, {eventCounter, prev, actionId}) {
    const actorB58 = new Id(actorId).toB58String()
    let eventHex = eventId.toString('hex')
    if (eventCounter <= actorState[actorB58]) {
      log('chain#event=%s IGNORE [counter] theirs=%o, ours=%o', eventHex, eventCounter, actorState[actorB58])
      return
    }

    log('chain#event=%s ACCEPT', eventHex)
    await storage.put(eventHex, data) // TODO: cleanup old blocks
  }

  /* if (isOnline) {
    rpcController.subscribe(id, {
      fetch: async (id) => id.startsWith('_') ? null : storage.get(id),
      process: async (data) => { // we get new blocks via pubsub or rpc

      }
    })
  } */
}
