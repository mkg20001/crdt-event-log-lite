'use strict'

/* eslint-disable no-console */

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('crdt-event-log-lite')

const Id = require('peer-id')
const EventLog = require('.')

let actorId
let controller
let treeId

suite.add('create controller for test', async () => {
  actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?

  controller = await EventLog.create({
    actor: actorId,
    storage: await EventLog.Storage.RAM()
  })
})

suite.add(`write to key 5 times`, async () => {
  let dbId = String(Math.random()).substr(2, 8)
  treeId = await controller.getId(actorId, {
    keys: [
      {
        collabrate: EventLog.Collabrate.NONE,
        permission: EventLog.Permission.OWNER,
        database: EventLog.Database.FLATDB,
        id: dbId
      }
    ]
  })

  let chain = await controller.load(treeId)
  let tree = await chain[dbId]()
  const count = 5

  for (var i = 0; i < count; i++) {
    await tree.write.setKey('hello', String(i))
  }
})

suite.on('cycle', (event) => {
  console.log(String(event.target))
})

// run async
suite.run({ async: true })
