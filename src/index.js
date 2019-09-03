'use strict'

const {ChainConfig, SignedChainConfig, CollabrationType, PermissionType, DatabaseType} = require('./proto')
const Id = require('peer-id')
const crypto = require('libp2p-crypto')

const Tree = require('./tree')
const TreeProcessor = require('./treeProcessor')
const RPCController = require('./rpcController')
const BlockController = require('./blockController')
const TreeController = require('./treeController')

const utils = require('./utils')

const Joi = require('@hapi/joi')

function EventLog ({actor, storage: storageController, type, swarm, blockHash}) {
  const isOnline = Boolean(swarm)

  if (!blockHash) {
    blockHash = require('multihashes').names['sha2-512']
  }

  const schemaSubKey = Joi.object().keys({
    collabrate: Joi.number().required(),
    permission: Joi.number().required(),
    database: Joi.number().required()
  })
  const schemaChainConfig = Joi.object().keys({
    preferredHash: Joi.number().default(blockHash),
    keys: Joi.array().items(schemaSubKey).min(1).required()
  }).required()

  let rpcController
  if (isOnline) {
    rpcController = RPCController(swarm)
  }

  async function loadChain (fullID) {
    const {pubKey, config, signature} = SignedChainConfig.decode(Buffer.from(fullID, 'hex'))
    const ownerId = await Id.createFromPubKey(pubKey)
    const configEncoded = ChainConfig.encode(config)
    const sigIsOk = await ownerId.pubKey.verify(signature)

    if (!sigIsOk) {
      throw new Error('Invalid chain config signature')
    }

    // TODO: validate config.ownerId

    const chainId = await multihash(config.preferredHash, configEncoded)
    const treeStorage = await storageController(chainId)

    const tree = await Tree({
      storage: treeStorage,
      ownerKey: ownerId
    })

    const isOwner = ownerId.toB58String() === actor.toB58String()

    const treeProcessor = await TreeProcessor({})
    const dbs = await utils.makeDatabases(chainId, storageController, treeProcessor, isOwner, config.subKeys)

    const blockController = await BlockController(fullID, {rpcController, storage: treeStorage, tree})
    const treeController = await TreeController(fullID, {tree, actorKey: actor, ownerKey: ownerId, blockHash, rpcController, blockController})

    tree.attachBlockController(blockController)

    tree.attach(treeProcessor.onPayload)

    /* return {
      read: structure.user.public,
      write: isOwner ? structure.user.private : {}
    } */
  }

  async function generateId (id, config) {
    if (!Id.isPeerId(id)) {
      throw new Error('Not a valid peerId')
    }

    config = Joi.validate(config, schemaChainConfig)

    const pubKey = crypto.keys.marshalPublicKey(id.pubKey)

    config.ownerId = id.toBytes()

    config = ChainConfig.decode(ChainConfig.encode(config))

    const signature = await id.privKey.sign(ChainConfig.encode(config))

    return SignedChainConfig.encode({ pubKey, config, signature })
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
  Collabrate: CollabrationType,
  Permission: PermissionType,
  Database: DatabaseType
}
