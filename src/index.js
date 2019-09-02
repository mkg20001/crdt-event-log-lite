'use strict'

const {GatheringID} = require('./proto')
const Id = require('peer-id')
const crypto = require('libp2p-crypto')

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

  async function loadChain (fullID) {
    const {pubKey, uuid} = GatheringID.decode(Buffer.from(fullID, 'hex'))
    const ownerId = await Id.createFromPubKey(pubKey)

    const storage = await storageController(fullID)

    const tree = await Tree({
      storage,
      ownerKey: ownerId
    })

    const isOwner = ownerId.toB58String() === actor.toB58String()

    const blockController = await BlockController(fullID, {rpcController, storage, tree})
    const treeController = await TreeController(fullID, {tree, actorKey: actor, ownerKey: ownerId, blockHash, rpcController, blockController})

    tree.attachBlockController(blockController)
    const structure = await type({storage, treeController})
    tree.attach(structure.payloadProcess)

    return {
      read: structure.user.public,
      write: isOwner ? structure.user.private : {}
    }
  }

  async function generateId (idOrPubKey, uuid) {
    const pubKey = idOrPubKey.pubKey ? idOrPubKey.pubKey : idOrPubKey.verify ? idOrPubKey : null

    if (!pubKey) {
      throw new Error('Not a valid public key!')
    }

    return GatheringID.encode({ pubKey: crypto.keys.marshalPublicKey(pubKey), uuid }).toString('hex')
  }

  return {
    load: loadChain,
    getId: generateId
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
  },
  Collabrate: {

  }
}
