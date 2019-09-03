'use strict'

/* eslint-env mocha */

const Id = require('peer-id')
const assert = require('assert')

const EventLog = require('..')

const sampleData = [
  ['hello', true],
  ['bye', false],
  ['no', 0],
  ['yes', 1]
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
    treeID = await controller.getId(actorId, {
      keys: [
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
    })
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
