'use strict'

/* eslint-env mocha */

const Id = require('peer-id')
const assert = require('assert')

const EventLog = require('..')

describe('eventTree', () => {
  let actorId
  let controller
  let tree

  before(async () => {
    actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
    global.TOTALLY_NOT_A_HACK = actorId
  })

  it('can create an event log', async () => {
    controller = await EventLog.create({
      actor: actorId,
      storage: await EventLog.Storage.RAM(),
      // swarm: null // means we're offline
      type: EventLog.Type.FlatObjectDB
      // collabrationStructure: EventLog.Collabrate.BenevolentDictator
    })
  })

  it('can create a tree with an actor peer-id', async () => {
    tree = await controller.load('test')
  })

  it('can change keys', async () => {
    await tree.write.setKey('hello', true)
  })

  it('can read keys', async () => {
    assert(await tree.read.getKey('hello'))
  })
})
