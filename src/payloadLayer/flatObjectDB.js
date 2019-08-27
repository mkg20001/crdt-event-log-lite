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
    bytes newValue = 4;
  }
`)

module.exports = async ({isOwner, storage, treeController}, {prefetch}) => {
  const object = {}
  const objectCache = {}

  object._delete = async (key) => {
    if (!isOwner) {
      throw new Error('Cannot delete values in non-owned tree!')
    }

    await treeController.append(Payload.encode({
      payloadType: PayloadType.DELETE,
      key,
      changeId: 1 // TODO: add
    }))

    deleteDynamicKey(key)
    saveKeys(keys.filter(k => k !== key))
  }

  async function saveKeys (_keys) {
    keys = _keys
    await storage.put('_keys', JSON.stringify(keys)) // TODO: storage putJSON, getJSON etc?
  }

  async function fetchFromCache (key) {
    log('fetching from cache %s', key)

    // TODO: maybe wait for block changes to arrive? or sth like that?

    const val = await storage.get('_val_' + key)
    const res = val ? JSON.parse(val) : null

    objectCache[key] = res
  }

  function createDynamicKey (key) {
    Object.defineProperty(object, 'key', {
      set: async (val) => {
        if (isOwner) {
          await treeController.append(Payload.encode({
            payloadType: PayloadType.PUT,
            key,
            changeId: 1, // TODO: add
            newValue: JSON.stringify(val)
          }))

          objectCache[key] = val
        } else {
          throw new Error('Cannot change values in non-owned tree!')
        }
      },
      get: () => {
        if (!objectCache[key]) {
          objectCache[key] = fetchFromCache(key)
        }

        return objectCache[key]
      }
    })
  }

  function deleteDynamicKey (key) {
    log('deleting %s', key)
    delete objectCache[key]
    delete object[key]
  }

  let keys = await storage.get('_keys')
  if (keys) {
    keys = JSON.parse(keys)
  } else {
    keys = []
  }

  await Promise.all(keys.map((key) => {
    createDynamicKey(key)
    if (prefetch) {
      fetchFromCache(key)
    }
  }))
}
