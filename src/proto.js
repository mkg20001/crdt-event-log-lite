'use strict'

const protons = require('protons')

module.exports = protons(`
  message Action {
    repeated bytes prev = 1;
    bytes payload = 2; // Payload data
  }

  message Event {
    int64 eventCounter = 1;
    repeated bytes prev = 2;
    bytes actionId = 3;
    bytes eventHash = 4;
  }

  message SignedEvent {
    bytes actorId = 1;
    Event event = 2;
    bytes signature = 3;
  }

  Enum BlockType {
    EVENT  = 1;
    ACTION = 2;
  }

  message BlockRequest {
    BlockType blockType = 1;
    bytes lastKnownAction = 2;
    bool iterate = 3; // send all action blocks
    /*
    If we subscribe to a new chain, we do
    {blockType: EVENT, lastKnownAction: null, iterate: true}
    to get the latest block for the chain
    Iterate tells the node to send us blocks until the lastKnownAction appears in the chain

    NOTE: new memebers of the chain get the blocks from latest to oldest, while older memebers get the blocks from oldest to newest
    The payload processor should account for that
    */
  }
`)
