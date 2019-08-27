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
  }

  async function saveRevisions (key, rev) {
    log('saving key %o rev %o', key, rev)
    keyRevisions[key] = rev
    await storage.put('_keyRevisions', JSON.stringify(keyRevisions)) // TODO: storage putJSON, getJSON etc?
  }

  async function fetchFromCache (key) {
    log('fetching from cache %s', key)

    // TODO: maybe wait for block changes to arrive? or sth like that?

    const val = await storage.get('_val_' + key)
    const res = val ? JSON.parse(val) : null

    objectCache[key] = res
  }

  async function processValueChange (key, val) {
    objectCache[key] = val
    await storage.put('_val_' + key, JSON.stringify(val))
  }

  async function createDynamicKey (key) {
    if (keys.indexOf(key) === -1) {
      keys.push(key)
      await saveKeys(keys)
    }

    Object.defineProperty(object, 'key', {
      set: async (val) => {
        if (isOwner) {
          await treeController.append(Payload.encode({
            payloadType: PayloadType.PUT,
            key,
            changeId: 1, // TODO: add
            newValue: JSON.stringify(val)
          }))

          await processValueChange(key, val)
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

  async function deleteDynamicKey (key) {
    log('deleting %s', key)
    delete objectCache[key]
    delete object[key]
    await saveKeys(keys.filter(k => k !== key))
  }

  let keys = await storage.get('_keys') // TODO: make object
  if (keys) {
    keys = JSON.parse(keys)
  } else {
    keys = []
  }

  let keyRevisions = await storage.get('_keyRevisions') // TODO: make object
  if (keyRevisions) {
    keyRevisions = JSON.parse(keyRevisions)
  } else {
    keyRevisions = {}
  }

  await Promise.all(keys.map((key) => {
    createDynamicKey(key)
    if (prefetch) {
      fetchFromCache(key)
    }
  }))

  treeController.attachProcessor()
}
