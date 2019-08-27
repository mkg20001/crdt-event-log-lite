'use strict'

const Tree = require('./tree')
const RPCController = require('./rpc')
const BlockController = require('./blockController')
const TreeController = require('./TreeController')

function EventLog ({actor, storage, type, swarm}) {
  const isOnline = Boolean(swarm)

  let rpcController
  if (isOnline) {
    rpcController = RPCController(swarm)
  }

  async function loadChain (id) {
    const _storage = await storage(id)

    const tree = await Tree({
      storage: _storage
    })

    const blockController = await BlockController(id, {rpcController, storage, tree})
    const treeController = await TreeController(id, {tree, actorKey: actor, blockHash, rpcController})

    await type({storage, treeController})
  }

  return {
    load: loadChain
  }
}

module.exports = {
  create: EventLog,
  Storage: {
    RAM: require('./store/ram'),
    LocalStorage: require('./store/localStorage')
  },
  Type: {
    FlatObjectDB: require('./payloadLayer/flatObjectDB')
  }
}
