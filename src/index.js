'use strict'

const Tree = require('./tree')

function EventLog ({actor, storage, swarm}) {

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
