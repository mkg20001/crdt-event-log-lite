'use strict'

const {Action, Event, SignedEvent} = require('./proto')
const multihashing = require('multihashing-async')

async function TreeController (id, {tree, actorKey, blockHash, rpcController, blockController}) {
  async function append (payload) {
    const actorId = actorKey._id
    const actorB58 = actorKey.toB58String()

    const action = Action.encode({
      prev: tree.chainState.action,
      payload
    })

    const actionId = await multihashing(action, blockHash)
    blockController.addUnprocessed(actionId.toString('hex'), action)

    const eventCounter = tree.actorState[actorB58] + 1

    const eventData = {
      prev: tree.chainState.event ? [tree.chainState.event] : [],
      eventCounter,
      actionId,
      eventHash: blockHash
    }

    const event = SignedEvent.encode({
      actorId,
      event: eventData,
      signature: await actorKey.privKey.sign(Event.encode(Event.decode(Event.encode(eventData)))) // we have to do this twice to sort keys. yeah...
    })

    const eventId = await multihashing(event, blockHash)

    await tree.onEvent(eventId, event)
    await blockController.announce(eventId, event)
  }

  return {
    append
  }
}

module.exports = TreeController
