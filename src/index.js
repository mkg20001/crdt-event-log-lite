'use strict'

const Tree = require('./tree')
const RPCController = require('./rpc')

function EventLog ({actor, storage, type, swarm}) {
  const isOnline = Boolean(swarm)

  let rpcController
  if (isOnline) {
    rpcController = RPCController(swarm)
  }

  async function loadChain (id) {
    const _storage = await storage(id)

    const tree = await Tree({
      actorKey: actor, // TODO: get key for chain from RPC
      storage: _storage,
      rpcController
    })

    rpcController.subscribe(id, tree)

    await type({storage, treeController: tree})
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
