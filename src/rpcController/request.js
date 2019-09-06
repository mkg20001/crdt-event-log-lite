'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const lp = require('pull-length-prefixed')

const debug = require('debug')
const log = debug('crdt-event-log-lite:rpcController:respond')

const {RPCError, BlockRequest, BlockResponse} = require('../proto')

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

module.exports = function ({ swarm }) {
  const peers = new Map()
  const dials = new Set()

  async function doDial (peer) {
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

  return {
    doDial,
    requestNetwork
  }
}
