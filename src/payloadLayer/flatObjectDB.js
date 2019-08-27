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
    int64 changeId = 2;
    bytes newValue = 3;
  }
`)

module.exports = async ({isOwner, storage, treeController}, {prefetch}) => {
  const object = {}
  const objectCache = {}

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
