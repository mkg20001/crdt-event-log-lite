'use strict'

const Tree = require('./tree')
const RPCController = require('./rpc')
const BlockController = require('./blockController')
const TreeController = require('./TreeController')

function EventLog ({actor, storage, type, swarm, blockHash}) {
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
    const treeController = await TreeController(id, {tree, actorKey: actor, blockHash, rpcController, blockController})

    tree.attachBlockController(blockController)
    const structure = await type({storage, treeController})
    tree.attach(structure.payloadProcess)

    return {
      read: structure.user.public,
      write: structure.user.private
    }
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
