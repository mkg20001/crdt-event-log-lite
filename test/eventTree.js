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

describe('eventTree + flatDB + collab/perm simple, offline', () => {
  let actorId
  let controller
  let tree
  let treeID
  let testDB

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
        }
      ]
    })
  })

  it('can create a tree with an actor peer-id', async () => {
    tree = await controller.load(treeID)
    testDB = await tree.testDB()
  })

  it('can change keys', async () => {
    await testDB.write.setKey('hello', true)
  })

  it('can read keys', async () => {
    assert(await testDB.read.getKey('hello'))
  })

  it('can delete keys', async () => {
    await testDB.write.delKey('hello')
  })

  it('can not read key anymore', async () => {
    assert(!(await testDB.read.getKey('hello')))
  })

  it('can batch change keys', async () => {
    await Promise.all(sampleData.map(([key, value]) => testDB.write.setKey(key, value)))
  })

  it('can batch delete keys', async () => {
    await Promise.all(sampleData.map(([key]) => testDB.write.delKey(key)))
  })
})
