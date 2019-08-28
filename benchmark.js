'use strict'

/* eslint-disable no-console */

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('crdt-event-log-lite')

const Id = require('peer-id')
const EventLog = require('.')

let actorId
let controller

suite.add('create chains/trees for test', async () => {
  actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
  global.TOTALLY_NOT_A_HACK = actorId

  controller = await EventLog.create({
    actor: actorId,
    storage: await EventLog.Storage.RAM(),
    // swarm: null // means we're offline
    type: EventLog.Type.FlatObjectDB
    // collabrationStructure: EventLog.Collabrate.BenevolentDictator
  })
})

suite.add(`write to key 5 times`, async () => {
  let tree = await controller.load(String(Math.random()))
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
