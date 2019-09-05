'use strict'

/* eslint-env mocha */

const Id = require('peer-id')
const Info = require('peer-info')
const assert = require('assert')

const EventLog = require('..')
const TestSwarm = require('./test-swarm')

const prom = (f) => new Promise((resolve, reject) => f((err, res) => err ? reject(err) : resolve(res)))

const sampleData = [
  ['hello', true],
  ['bye', false],
  ['no', 0],
  ['yes', 1]
]

const treeKeys = [
  {
    collabrate: EventLog.Collabrate.NONE,
    permission: EventLog.Permission.OWNER,
    database: EventLog.Database.FLATDB,
    id: 'testDB'
  },
  {
    collabrate: EventLog.Collabrate.SIMPLE,
    permission: EventLog.Permission.ANYONE,
    database: EventLog.Database.FLATDB,
    id: 'testCollab'
  }
]

const testFlat = (t) => {
  it('can change keys', async () => {
    await t.testDB.write.setKey('hello', true)
  })

  it('can read keys', async () => {
    assert(await t.testDB.read.getKey('hello'))
  })

  it('can delete keys', async () => {
    await t.testDB.write.delKey('hello')
  })

  it('can not read key anymore', async () => {
    assert(!(await t.testDB.read.getKey('hello')))
  })

  it('can batch change keys', async () => {
    await Promise.all(sampleData.map(([key, value]) => t.testDB.write.setKey(key, value)))
  })

  it('can batch delete keys', async () => {
    await Promise.all(sampleData.map(([key]) => t.testDB.write.delKey(key)))
  })

  it('can subscribe to key changes', async () => {
    const change = new Promise((resolve, reject) => {
      t.testDB.read.subscribeKey('testSub', (k, v) => resolve({k, v}))
    })

    await t.testDB.write.setKey('testSub', true)

    const res = await change

    assert.deepEqual(res, {k: 'testSub', v: true})
  })
}

describe('eventTree + flatDB, offline', () => {
  let actorId
  let controller
  let tree
  let treeID

  before(async () => {
    actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
  })

  it('can create an event log', async () => {
    controller = await EventLog.create({
      actor: actorId,
      storage: await EventLog.Storage.RAM()
      // swarm: null // means we're offline
    })
    treeID = await controller.getId(actorId, { keys: treeKeys })
  })

  it('can create a tree with an actor peer-id', async () => {
    tree = await controller.load(treeID)
  })

  describe('perm=owner, collab=none', () => {
    let t = {}

    before(async () => {
      t.testDB = await tree.testDB()
    })

    testFlat(t)
  })

  describe('perm=any, collab=simple', () => {
    let t = {}

    before(async () => {
      t.testDB = await tree.testCollab(actorId.toB58String())
    })

    testFlat(t)
  })
})

describe('eventTree + flatDB, online', () => {
  let actorId
  let actorInfo
  let actorSwarm
  let actorController
  let actorTree

  let memberId
  let memberInfo
  let memberSwarm
  let memberController
  let memberTree

  let treeID

  before(async () => {
    actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
    memberId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?

    actorInfo = new Info(actorId)
    actorInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/4588')
    memberInfo = new Info(memberId)
    memberInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/4589')

    actorSwarm = new TestSwarm({ peerInfo: actorInfo })
    memberSwarm = new TestSwarm({ peerInfo: memberInfo })

    await Promise.all([actorSwarm, memberSwarm].map(s => prom(cb => s.start(cb))))
  })

  it('can create event controllers', async () => {
    actorController = await EventLog.create({
      actor: actorId,
      storage: await EventLog.Storage.RAM(),
      swarm: actorSwarm
    })
    memberController = await EventLog.create({
      actor: actorId,
      storage: await EventLog.Storage.RAM(),
      swarm: actorSwarm
    })
  })

  it('can create an event tree', async () => {
    treeID = await actorController.getId(actorId, { keys: treeKeys })
    actorTree = await actorController.load(treeID)
    memberTree = await memberController.load(treeID)
  })

  it('can connect to other peer', async () => {
    await prom(cb => actorSwarm.dial(memberInfo, cb))
  })

  describe('perm=owner, collab=none', () => {
    let t = {}

    before(async () => {
      t.testDB = await actorTree.testDB()
    })

    it('write key from actor', async () => {
      const db = await actorTree.testDB()
      await db.write.setKey('t1', true)
    })

    it('load key from member', async () => {
      const db = await memberTree.testDB()
      assert(await db.read.getKey('t1'))
    })

    it('write from actor, subscribe from member', async () => {
      const dbA = await actorTree.testDB()
      const dbM = await memberTree.testDB()

      const change = new Promise((resolve, reject) => {
        dbM.read.subscribeKey('t2', (k, v) => resolve({k, v}))
      })

      await dbA.write.setKey('t2', true)

      const res = await change

      assert.deepEqual(res, {k: 't2', v: true})
    })

    testFlat(t)
  })

  describe('perm=any, collab=simple', () => {
    let t = {}

    before(async () => {
      t.testDB = await memberTree.testCollab(memberTree.toB58String())
    })

    testFlat(t)
  })

  after(async () => {
    await Promise.all([actorSwarm, memberSwarm].map(s => prom(cb => s.stop(cb))))
  })
})
