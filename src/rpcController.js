'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const lp = require('pull-length-prefixed')

const debug = require('debug')
const log = debug('crdt-event-log-lite:rpcController')

const {RPCError, BlockRequest, BlockResponse} = require('./proto')

const prom = (f) => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))
const defer = () => {
  let o = new Promise((resolve, reject) => {
    o.resolve = resolve
    o.reject = reject
  })

  return o
}

async function RPCWrapper (peer, swarm) {
  const conn = await prom(cb => swarm.dialProtocol(peer, '/event-log-lite/exchange/1.0.0', cb))

  let out = Pushable()
  let queue = []

  let isOnline = true

  pull(
    out,
    lp.encode(),
    conn,
    lp.decode(),
    pull.asyncMap((res, cb) => {
      let _fin = queue.shift()
      let fin = (err, res) => {
        if (_fin) {
          _fin(err, res)
        }
        cb()
      }

      try {
        res = BlockResponse.decode(res)
      } catch (err) {
        return fin(err)
      }

      if (res.error) {
        fin(new Error('RPCError ' + res.error))
      } else {
        fin(res.blocks)
      }
    }),
    pull.drain(null, () => {
      isOnline = false
      queue.forEach(el => {
        el.reject(new Error('Peer went offline!'))
      })

      // gc and destroy
      queue = null
      out = null
    })
  )

  return {
    send: async (data) => {
      if (!isOnline) {
        throw new Error('Peer is offlnie!')
      }

      let d = defer()
      out.push(BlockRequest.encode(data))
      queue.push(d)

      return d
    },
    isOnline: () => isOnline
  }
}

function RPCController ({swarm}) {
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

  const peers = new Map()
  const dials = new Set()

  async function doDial () {
    let b58 = peer.id.toB58String()

    let rpc = peers.get(b58)
    if (rpc && rpc.isOnline()) {
      return
    }

    if (dials.has(b58)) {
      return
    }

    dials.add(b58)

    try {
      log('dial %s', b58)
      rpc = await RPCWrapper(peer)
      peers.set(b58, rpc)
    } catch (err) {
      // do nothin
    }

    dials.delete(b58)
  }

  swarm.on('peer:connect', doDial)

  setInterval(() => {
    peers.forEach((b58, rpc) => {
      if (!rpc.isOnline()) {
        log('gc %s', b58)
        peers.delete(b58)
      }
    })
  })

  async function requestNetwork (parameters) {
    let network = Array.from(peers.entries())

    if (!network.length) {
      throw new Error('No peer is online!')
    }

    async function tryPeer () {
      const next = network.shift()

      if (!next) {
        throw new Error('Failed to query network')
      }

      const [b58, rpc] = next
      log('try %s', b58)

      let res

      if (rpc.isOnline()) {
        try {
          res = await rpc.send(parameters)
        } catch (err) {
          log('%s: %s', b58, err)
        }
      }

      if (res) {
        return res
      } else {
        return tryPeer()
      }
    }

    return tryPeer()
  }

  return (chainId) => {
    return {
      blockRequest: async (parameters) => {
        parameters.chainId = chainId

        return requestNetwork(parameters)
      },
      // TODO: send eventId as well?
      subscribe: async ({onEvent}) => {
        await prom(cb => swarm.pubsub.subscribe(chainId.toString('hex'), async (msg) => {
          const peer = swarm.peerBook._peers[msg.from]
          if (peer) {
            await doDial(peer)
          }
          onEvent(null, msg.data)
        }, cb))
      },
      announce: async (eventId, eventData) => {
        await prom(cb => swarm.pubsub.publish(chainId.toString('hex'), eventData, cb))
      }
    }
  }
}

module.exports = RPCController
