'use strict'

const {Event, Action, SignedEvent, BlockType} = require('./proto')

const multihash = require('multihashes')
const multihashing = require('multihashing-async')
const Id = require('peer-id')

const debug = require('debug')
const log = debug('crdt-event-log-lite:tree')
const Queue = require('./queue')

async function Tree ({storage, rpcController}) {
  let payloadProcess
  let blockController

  const chainState = await storage.getJSON('_chainState', {})
  const actorState = await storage.getJSON('_actorState', {})
  let queue = await storage.getJSON('_queue', [])
  const processed = await storage.getJSON('_processed', {})

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

    const actorKey = global.TOTALLY_NOT_A_HACK // getActorKey(actorId)

    // TODO: currently anyone can write anything

    const sigIsOk = await actorKey.pubKey.verify(eventData, signature) // TODO: dynamically aquire key
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
    log('chain#op UPDATE EVENT %s', eventHex)
    await storage.put(eventHex, data) // TODO: cleanup old blocks
    await saveChainState('event', eventHex)

    await processLatestAction(eventId, actionId)
  }

  async function processLatestAction (eventId, actionId) {
    let eventHex = eventId.toString('hex')
    let actionHex = actionId.toString('hex')
    log('chain#op UPDATE ACTION %s{%s}', actionHex, eventHex)

    await saveChainState('action', actionHex)
    await syncUpToAction(actionId)
  }

  async function verifyAction (actionId, action) {
    let hashName = multihash.decode(actionId).name
    let realHash = await multihashing(action, hashName)

    if (!realHash.equals(actionId)) {
      throw new Error('Real hash is not equal action id')
    }

    return true
  }

  const actionQueue = Queue()
  async function syncUpToAction (actionId) {
    let actionHex = actionId.toString('hex')

    if (processed[actionHex]) {
      return true
    }

    await saveQueueAdd(actionHex)

    return actionQueue(async () => {
      const action = await blockController.fetch(BlockType.ACTION, actionId)
      if (!await verifyAction(actionId, action)) {
        log('chain#action=%s REJECT', actionHex)
        await saveQueueRemove(actionHex)
        throw new Error('Rejected ' + actionHex)
      } else {
        log('chain#action=%s ACCEPT', actionHex)
        await storage.put(actionHex, action) // TODO: cleanup old blocks

        const {payload, prev} = Action.decode(action)

        await safePayloadProcess(actionId, payload)

        if (prev) {
          await saveQueueAdd(prev.toString('hex'))
          syncUpToAction(prev)
        }

        await saveProcessed(actionHex)
        await saveQueueRemove(actionHex)
      }
    })
  }

  const payloadQueue = Queue()
  async function safePayloadProcess (actionId, payload) {
    return payloadQueue(() => payloadProcess(actionId, payload))
  }

  async function saveChainState (type, val) {
    chainState[type] = val
    await storage.putJSON('_chainState', chainState)
  }

  async function saveQueueAdd (hex) {
    if (queue.indexOf(hex) === -1) {
      queue.push(hex)
      await storage.putJSON('_queue', queue)
    }
  }

  async function saveQueueRemove (hex) {
    if (queue.indexOf(hex) !== -1) {
      queue = queue.filter(h => h !== hex)
      await storage.putJSON('_queue', queue)
    }
  }

  async function saveProcessed (hex) {
    processed[hex] = true
    await storage.putJSON('_processed', processed)
  }

  async function fetchLatestEvent () {
    if (rpcController) {
      const latest = await rpcController.blockRequest({type: BlockType.EVENT})
      await verifyEvent(null, latest)
    } else {
      return true
    }
  }

  if (rpcController) {
    fetchLatestEvent()
  }

  return {
    onEvent: verifyEvent,
    attach: (_payloadProcess) => (payloadProcess = _payloadProcess),
    attachBlockController: (_blockController) => (blockController = _blockController),
    chainState,
    actorState
  }
}

module.exports = Tree
