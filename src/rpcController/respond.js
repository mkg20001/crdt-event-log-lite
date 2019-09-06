'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const lp = require('pull-length-prefixed')

const debug = require('debug')
const log = debug('crdt-event-log-lite:rpcController:respond')

const {RPCError, BlockRequest, BlockResponse} = require('./proto')

module.exports = async function ({ swarm, storageBox }) {
  async function handleRPC (peer, req) {
    log('handle RPC %O', req)

    const storage = storageBox[req.chainId.toString('hex')]

    if (!storage) {
      return RPCError.CHAIN_UNKNOWN
    }

    const blockId = req.blockId.toString('hex')

    if (blockId.startsWith('_')) { // protect private entries (id is hex, but that might change soon)
      return RPCError.BLOCK_UNKNOWN
    }

    const type = req.blockType
    const depth = req.blockDepth

    if (!depth) {
      const data = await storage.get(blockId)
      return [
        {
          id: req.blockId,
          content: data
        }
      ]
    } else {
      if (type !== 2) { // depth is only valid for action
        return RPCError.MALFORMED_REQ
      }

      if (depth > 20 || depth < 2) {
        return RPCError.DEPTH_LENGTH
      }

      return RPCError.INTERNAL // TODO: add depth handling
    }
  }

  swarm.handle('/event-log-lite/exchange/1.0.0', (ver, conn) => {
    const out = Pushable()

    conn.getPeerInfo((err, peer) => {
      if (err) {
        return log(err)
      }

      pull(
        out,
        lp.encode(),
        conn,
        lp.decode(),
        pull.asyncMap((req, cb) => {
          const _res = (error, blocks) => {
            out.push(BlockResponse.encode({ error, blocks }))
          }

          try {
            req = BlockRequest.decode(req)
          } catch (err) {
            _res(RPCError.MALFORMED_REQ)
            return cb()
          }

          handleRPC(peer, req).then((res) => {
            if (typeof res === 'number') { // RPCError shorthand
              _res(res)
            } else {
              _res(0, res)
            }
            return cb()
          }, (err) => {
            _res(err.code || RPCError.INTERNAL)
            return cb()
          })
        }),
        pull.drain()
      )
    })
  })

  return {}
}
