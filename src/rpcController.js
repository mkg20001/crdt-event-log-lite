'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')

const debug = require('debug')
const log = debug('crdt-event-log-lite:rpcController')

const {RPCError, BlockRequest, BlockResponse} = require('./proto')

async function RPCController ({swarm}) {
  async function handleRPC (peer, req) {
    log('handle RPC %O', req)
  }

  swarm.handle('/event-log-lite/exchange/1.0.0', (ver, conn) => {
    const out = Pushable()

    conn.getPeerInfo((err, peer) => {
      if (err) {
        return log(err)
      }

      pull(
        out,
        conn,
        pull.asyncMap((req, cb) => {
          const _res = (error, blocks) => {
            out.push(BlockResponse.encode({ error, blocks }))
          }

          try {
            req = BlockRequest.decode(req)
          } catch (err) {
            _res(RPCError.MALFORMED)
            return cb()
          }

          handleRPC(peer, req).then((res) => {
            _res(0, res)
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

  /* return {
    blockRequest: async (parameters) => { // TODO

    },
    subscribe: async (chainId, dbId, {onEvent}) => { // TODO: sub via pubsub

    }
  } */

  return (chainId, dbId) => {
    return {

    }
  }
}

module.exports = RPCController
