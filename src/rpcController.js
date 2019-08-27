'use strict'

async function RPCController ({swarm}) {
  return {
    blockRequest: async (parameters) => { // TODO

    },
    subscribe: async (chainId, {onEvent}) => { // TODO: sub via pubsub

    }
  }
}

module.exports = RPCController
