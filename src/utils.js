'use strict'

const {CollabrationType, PermissionType, DatabaseType} = require('./proto')

const databases = {
  [DatabaseType.FLATDB]: require('./payloadLayer/flatObjectDB')
}

module.exports = {
  makeDatabases: (chainId, storageController, isOwner, dbConfig) => {
    dbConfig.map(() => {

    })
  }
}
