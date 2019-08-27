'use strict'

/* eslint-env mocha */

const Id = require('peer-id')

const EventLog = require('..')
const Storage = require('../src/store/ram')

describe('eventTree', () => {
  let actorId
  let controller
  let tree

  before(async () => {
    actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
  })

  it('can create an event log', () => {
    controller = EventLog({
      actor: actorId,
      storage: Storage()
      // swarm: null // means we're offline
    })
  })

  it('can create a tree with an actor peer-id', () => {
    tree = controller.ownTree
    controller.ownTree.firstBlock()
  })
})
