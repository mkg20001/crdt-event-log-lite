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

const cases = [
  ['hello', 1000]
  // [100, 262144],
  // [1000, 262144]
  // [10000, 262144],
  // [100000, 262144],
  // [1000000, 262144]
]
cases.forEach(([key, count]) => {
  suite.add(`write to key ${key} ${count} times`, async () => {
    let tree = await controller.load(String(Math.random()))

    for (var i = 0; i < count; i++) {
      await tree.write.setKey(key, String(i))
    }
  })

  /* suite.add(`send encrypted ${times} x ${size} bytes`, (deferred) => {
    const p = pair()

    const peerA = peers[0]
    const peerB = peers[1]

    const aToB = ifErr(secio.encrypt(peerA, new Connection(p[0]), peerB))
    const bToA = ifErr(secio.encrypt(peerB, new Connection(p[1]), peerA))

    sendData(aToB, bToA, { times: times, size: size }, deferred)
  }, { defer: true }) */
})

suite.on('cycle', (event) => {
  console.log(String(event.target))
})

// run async
suite.run({ async: true })
