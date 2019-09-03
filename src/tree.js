'use strict'

const {Event, Action, SignedEvent, BlockType, PermissionType, CollabrationType} = require('./proto')

const multihash = require('multihashes')
const multihashing = require('multihashing-async')
const Id = require('peer-id')
const c = require('./utils').c

const debug = require('debug')
const log = debug('crdt-event-log-lite:tree')
const Queue = require('./queue')

async function Tree ({storage, rpcController, ownerKey, dbs}) {
  let payloadProcess
  let blockController

  const chainState = await storage.getJSON('_chainState', {})
  const actorState = await storage.getJSON('_actorState', {})
  let queue = await storage.getJSON('_queue', [])
  const processed = await storage.getJSON('_processed', {})

  async function verifyEvent (eventId, data) {
    const {compressedActorKey, event, signature} = SignedEvent.decode(data)
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

    // TODO: currently anyone can write anything

    const actorId = await Id.createFromPubKey(await c.uncompressGZIP(compressedActorKey))
    const sigIsOk = await actorId.pubKey.verify(eventData, signature) // TODO: dynamically aquire key
    if (!sigIsOk) {
      throw new Error('Signature is bad')
    }

    return processEvent(eventId, data, actorId, event)
  }

  async function processEvent (eventId, data, actorId, {eventCounter, prev, actionId}) {
    const actorB58 = actorId.toB58String()

    let eventHex = eventId.toString('hex')
    if (eventCounter <= actorState[actorB58]) {
      log('chain#event=%s IGNORE [counter] theirs=%o, ours=%o', eventHex, eventCounter, actorState[actorB58])
      return
    }
    await saveActorState(actorB58, eventCounter)

    log('chain#event=%s ACCEPT', eventHex)
    log('chain#op UPDATE EVENT %s~%s', actorB58, eventHex)
    await storage.put(eventHex, data) // TODO: cleanup old blocks
    await saveChainState('event.' + actorB58, eventHex)

    await processLatestAction(eventId, actionId, actorB58)
  }

  async function processLatestAction (eventId, actionId, actorB58) {
    let eventHex = eventId.toString('hex')
    let actionHex = actionId.toString('hex')
    log('chain#op UPDATE ACTION %s{%s}~%s', actionHex, eventHex, actorB58)

    await saveChainState('action.' + actorB58, actionHex)
    await syncUpToAction(actionId, actorB58)
  }

  async function verifyAction (actionId, action, actorB58) {
    let hashName = multihash.decode(actionId).name
    let realHash = await multihashing(action, hashName)

    if (!realHash.equals(actionId)) {
      throw new Error('Real hash is not equal action id')
    }

    const {dbId, payload, prev} = Action.decode(action)

    const db = dbs[dbId]

    if (!db) {
      throw new Error('Referenced db not found in chain')
    }

    // check permissions

    switch (db.permission) {
      case PermissionType.OWNER: {
        if (ownerKey.toB58String() !== actorB58) {
          throw new Error('Permission type owner, but actor is not owner')
        }
        break
      }
      case PermissionType.ANYONE: {
        break
      }
      case PermissionType.PRESPECIFIED: {
        throw new Error('WIP')
      }

      default: throw new TypeError('No permission type ' + db.permission)
    }

    // verify collabrate

    switch (db.collabrate) {
      case CollabrationType.NONE: {
        if (db.permission !== PermissionType.OWNER) {
          throw new Error('When collabration disabled, only owner can write')
        }
        break
      }
      case CollabrationType.SIMPLE: {
        break
      }
      case CollabrationType.MULTI: {
        break
      }
      default: throw new TypeError('No collab type ' + db.collabrate)
    }

    return {dbId, payload, prev}
  }

  const actionQueue = Queue()
  async function syncUpToAction (actionId, actorB58) {
    let actionHex = actionId.toString('hex')

    if (processed[actionHex]) {
      return true
    }

    await saveQueueAdd(actionHex, actorB58)

    return actionQueue(async () => {
      const action = await blockController.fetch(BlockType.ACTION, actionId)
      let actionDecoded

      if (!(actionDecoded = (await verifyAction(actionId, action, actorB58)))) {
        log('chain#action=%s REJECT %o', actionHex)
        await saveQueueRemove(actionHex)
        throw new Error('Rejected ' + actionHex)
      } else {
        log('chain#action=%s ACCEPT', actionHex)
        await storage.put(actionHex, action) // TODO: cleanup old blocks

        const {prev, payload, dbId} = actionDecoded

        await safePayloadProcess(actionId, actorB58, dbId, payload)

        if (prev) {
          let prevHex = prev.toString('hex')
          if (!processed[prevHex]) {
            syncUpToAction(prev)
          }
        }

        await saveProcessed(actionHex)
        await saveQueueRemove(actionHex)
      }
    })
  }

  const payloadQueue = Queue()
  async function safePayloadProcess (actionId, actorB58, dbId, payload) {
    return payloadQueue(() => payloadProcess(actionId, actorB58, dbId, payload))
  }

  async function saveChainState (type, val) {
    chainState[type] = val
    await storage.putJSON('_chainState', chainState)
  }

  async function saveActorState (type, val) {
    actorState[type] = val
    await storage.putJSON('_actorState', actorState)
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
