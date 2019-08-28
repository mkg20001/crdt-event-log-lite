'use strict'

const protons = require('protons')

const debug = require('debug')
const log = debug('crdt-event-log-lite:flatObjectDB')

const {Payload, PayloadType} = protons(`
  enum PayloadType {
    PUT = 1;
    DELETE = 2;
  }

  message Payload {
    PayloadType payloadType = 1;
    string key = 2;
    int64 changeId = 3;
    bytes value = 4;
  }
`)

module.exports = async ({storage, treeController}) => {
  let keys = await storage.getJSON('_keys', [])
  const keyRevisions = await storage.getJSON('_keyRevisions', {})

  const cache = {}

  async function getKey (key) {
    if (cache[key]) {
      return cache[key]
    } else {
      let prom = cache[key] = fetchKey(key)
      cache[key] = await prom
      return prom
    }
  }

  async function setKey (key, val) {
    let rev = (keyRevisions[key] || 0) + 1

    await treeController.append(Payload.encode({ // this will create the block and run a sync. (TODO: maybe run sync before for multi-device access?)
      payloadType: PayloadType.PUT,
      key,
      changeId: rev,
      value: Buffer.from(JSON.stringify(val))
    }))
  }

  async function delKey (key) {
    if (keys.indexOf(key) === -1) {
      return true
    }

    let rev = keyRevisions[key] + 1

    await treeController.append(Payload.encode({ // this will create the block and run a sync. (TODO: maybe run sync before for multi-device access?)
      payloadType: PayloadType.DELETE,
      key,
      changeId: rev
    }))
  }

  async function fetchKey (key) {
    const res = await storage.getJSON('_val_' + key)
    if (res) {
      return res
    } else {
      // await treeController.blockUntilSynced()
      throw new Error('Should fetch from tree here')
    }
  }

  async function payloadProcess (id, payload) { // processor gets called for each block one by one
    const {payloadType, key, changeId, value} = Payload.decode(payload)
    if (keyRevisions[key] > changeId) { // if we have a newer change id
      log('flatDb#payload=%s~%s IGNORE [changeId]', key, changeId)
    } else {
      log('flatDb#payload=%s~%s ACCEPT', key, changeId)
      switch (payloadType) {
        case PayloadType.PUT:
          await saveKeyAdd(key) // adds if not exist
          await processValueChange(key, JSON.parse(String(value))) // update value
          break
        case PayloadType.DELETE:
          await saveKeyRemove(key)
          break
        default: {
          throw new TypeError('Invalid PayloadType ' + payloadType)
        }
      }

      await saveRevisions(key, changeId)
    }
  }

  async function processValueChange (key, val) {
    cache[key] = val
    await storage.putJSON('_val_' + key, val)
  }

  async function saveKeyAdd (key) {
    if (keys.indexOf(key) === -1) {
      keys.push(key)
      await storage.putJSON('_keys', keys)
    }
  }

  async function saveKeyRemove (key) {
    if (keys.indexOf(key) !== -1) {
      keys = keys.filter(k => k !== key)
      await storage.putJSON('_keys', keys)
      await storage.del('_val_' + key)
    }
  }

  async function saveRevisions (key, rev) {
    log('saving key %o rev %o', key, rev)
    keyRevisions[key] = rev
    await storage.putJSON('_keyRevisions', keyRevisions) // TODO: storage putJSON, getJSON etc?
  }

  return {
    user: {
      public: {
        getKey
      },
      private: {
        setKey,
        delKey
      }
    },
    payloadProcess
  }
}
