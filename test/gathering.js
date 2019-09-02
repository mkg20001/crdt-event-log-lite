'use strict'

/* eslint-env mocha */

const Id = require('peer-id')
const assert = require('assert')

const EventLog = require('..')

/*
{
  "gathering": {
    "key": "demo-1565648754985",
    "end": "2019-08-13T09:00:00",
    "place": "test",
    "name": "Demo"
  },
  "members": {
    "02c86c2d33e89470cd8e4267f95d8cc7ebd3d30c72acaec5b70493ed900f04103f": {
      "id": "02c86c2d33e89470cd8e4267f95d8cc7ebd3d30c72acaec5b70493ed900f04103f",
      "name": "upbringing enclosed",
      "avatar": null,
      "peerId": "QmSePMCtteDUZwwrijaUEj6bGG9qeZcW3mFMrRFBdcsoLK",
      "codename": "upbringing enclosed",
      "publicKey": "pYD30YqxcZoWLYExbBRwzSnkpIvLTiRCnr+zU6l81C4=",
      "includeRank": true,
      "privateInfo": null,
      "organization": ""
    },
    "03a02578f804dfa07b4255900af7a79241c20c4ce4869bc0d65b6060258834d6ad": {
      "id": "03a02578f804dfa07b4255900af7a79241c20c4ce4869bc0d65b6060258834d6ad",
      "name": "subculture treacherous",
      "avatar": null,
      "peerId": "QmSWTxAJbrn5pT1jJrfPgbh8GLVT6vM7jcBG3QQJfH6Ptv",
      "codename": "subculture treacherous",
      "publicKey": "AG5vBT4etW4spuE2mClMFL4Xbi5NvfGbA7X68KXdDFM=",
      "includeRank": true,
      "privateInfo": null,
      "organization": ""
    }
  },
  "affinities": {},
  "connections": {
    "02c86c2d33e89470cd8e4267f95d8cc7ebd3d30c72acaec5b70493ed900f04103f": {
      "03a02578f804dfa07b4255900af7a79241c20c4ce4869bc0d65b6060258834d6ad": {
        "key": "w0QvjXmyiphoBtTnXMUCW4vOvOk1H1Pqhe4HdDBFiFjMm74DEmLK9PaGL4P7RQSBDsYVxRtKwCKEADW8UcW6+n7xVpBYW4200gwdPX8ZK8ZDdiUyCTA=",
        "status": 1
      }
    },
    "03a02578f804dfa07b4255900af7a79241c20c4ce4869bc0d65b6060258834d6ad": {
      "02c86c2d33e89470cd8e4267f95d8cc7ebd3d30c72acaec5b70493ed900f04103f": {
        "key": "9JWG7tfv2dW2H2Jzj6RSIk11QpXpOMHkfIFirM+grlMQ/sjYFglUINjrqbWBr8TmaR7ZImE11PNGjTBRtk6J8FYbwSqvcF/VkSUgwFJBqMouTfYy8N8=",
        "status": 0
      }
    }
  },
  "recommendations": {},
  "stars": {},
  "starsAvailable": {},
  "score": {
    "02c86c2d33e89470cd8e4267f95d8cc7ebd3d30c72acaec5b70493ed900f04103f": {
      "requests": 1,
      "requestsAccepted": 0,
      "requestsDeclined": 0,
      "recommendations": 0,
      "recommendationsAccepted": 0,
      "recommendationsDeclined": 0,
      "stars": 0,
      "superMatches": 0,
      "points": -1
    },
    "03a02578f804dfa07b4255900af7a79241c20c4ce4869bc0d65b6060258834d6ad": {
      "requests": 1,
      "requestsAccepted": 1,
      "requestsDeclined": 0,
      "recommendations": 0,
      "recommendationsAccepted": 0,
      "recommendationsDeclined": 0,
      "stars": 0,
      "superMatches": 0,
      "points": 1
    }
  }
}
*/

describe('eventTree + flatDB, offline', () => {
  let actorId
  let memberId
  let controller
  let controllerMember
  let tree
  let treeMember
  let gatheringID

  before(async () => {
    actorId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?
    memberId = await Id.create({type: 'rsa', size: 2048}) // use test-peer-ids.tk for 4k tests?

    controller = await EventLog.create({
      actor: actorId,
      storage: await EventLog.Storage.RAM(),
      // swarm: null // means we're offline
      type: EventLog.Type.FlatObjectDB,
      collabrationStructure: EventLog.Collabrate.SimpleActorID
    })

    controllerMember = await EventLog.create({
      actor: memberId,
      storage: await EventLog.Storage.RAM(),
      // swarm: null // means we're offline
      type: EventLog.Type.FlatObjectDB,
      collabrationStructure: EventLog.Collabrate.SimpleActorID
    })
  })

  it('create gathering', async () => {
    const gatheringUUID = String(Math.random())
    gatheringID = controller.getId(actorId, gatheringUUID)

    tree = await controller.load(gatheringID)
    await tree.write.setKey('gathering', {
      end: '2019-08-13T09:00:00',
      place: 'test',
      name: 'Demo'
    })

    // await tree.collabrate.write.enableOn('members')
  })

  it('add member', async () => {

  })
})
