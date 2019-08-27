'use strict'

const Tree = require('./tree')
const RPCController = require('./rpcController')
const BlockController = require('./blockController')
const TreeController = require('./treeController')

function EventLog ({actor, storage: storageController, type, swarm, blockHash}) {
  const isOnline = Boolean(swarm)

  if (!blockHash) {
    blockHash = require('multihashes').names['sha2-512']
  }

  let rpcController
  if (isOnline) {
    rpcController = RPCController(swarm)
  }

  async function loadChain (id) {
    const storage = await storageController(id)

    const tree = await Tree({
      storage
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
