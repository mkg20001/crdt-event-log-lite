'use strict'

const {Action, Event, SignedEvent} = require('./proto')
const multihashing = require('multihashing-async')
const Queue = require('./queue')

const crypto = require('libp2p-crypto')
const c = require('./utils').c

async function TreeController (id, {tree, actorKey, blockHash, rpcController, blockController}) {
  const appendQueue = Queue()

  const actorB58 = actorKey.toB58String()
  const compressedActorKey = await c.compressGZIP(await crypto.keys.marshalPublicKey(actorKey.pubKey))

  async function append (dbId, payload) {
    return appendQueue(async () => {
      const action = Action.encode({
        prev: tree.chainState[`action.${actorB58}`] ? Buffer.from(tree.chainState[`action.${actorB58}`], 'hex') : null,
        dbId,
        payload
      })

      const actionId = await multihashing(action, blockHash)
      blockController.addUnprocessed(actionId.toString('hex'), action)

      const eventCounter = tree.actorState[actorB58] + 1

      const eventData = {
        prev: tree.chainState[`event.${actorB58}`] ? [Buffer.from(tree.chainState[`event.${actorB58}`], 'hex')] : [],
        eventCounter,
        actionId,
        eventHash: blockHash
      }

      const event = SignedEvent.encode({
        compressedActorKey,
        event: eventData,
        signature: await actorKey.privKey.sign(Event.encode(Event.decode(Event.encode(eventData)))) // we have to do this twice to sort keys. yeah...
      })

      const eventId = await multihashing(event, blockHash)

      await tree.onEvent(eventId, event)
      await blockController.announce(eventId, event)
    })
  }

  return {
    append
  }
}

module.exports = TreeController
