'use strict'

const debug = require('debug')
const log = debug('crdt-event-log-lite:rpcController')

const prom = (f) => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))

const Request = require('./request')
const Respond = require('./respond')

function RPCController ({swarm}) {
  const storageBox = {} // lel

  const {doDial, requestNetwork} = Request({ swarm })
  Respond({ swarm, storageBox })

  return ({ chainId, treeStorage }) => {
    storageBox[chainId.toString('hex')] = treeStorage

    return {
      blockRequest: async (parameters) => {
        parameters.chainId = chainId

        return requestNetwork(parameters)
      },
      // TODO: send eventId as well?
      subscribe: async ({onEvent}) => {
        await prom(cb => swarm.pubsub.subscribe(chainId.toString('hex'), async (msg) => {
          const peer = swarm.peerBook._peers[msg.from] // TODO: why is this not working

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
