'use strict'

const protons = require('protons')

/* message BlockRequest {
  BlockType blockType = 1;
  bytes lastKnownAction = 2;
  bool iterate = 3; // send all action blocks
  /
  If we subscribe to a new chain, we do
  {blockType: EVENT, lastKnownAction: null, iterate: true}
  to get the latest block for the chain
  Iterate tells the node to send us blocks until the lastKnownAction appears in the chain

  NOTE: new memebers of the chain get the blocks from latest to oldest, while older memebers get the blocks from oldest to newest
  The payload processor should account for that
  /
} */

module.exports = protons(`message Action {
  bytes prev = 1;
  bytes payload = 2; // Payload data
  bytes collabrationPayload = 3; // Payload data for identifiying the collabration structure and the collabration details
}

message Event {
  int64 eventCounter = 1;
  repeated bytes prev = 2;
  bytes actionId = 3;
  int64 eventHash = 4;
}

message SignedEvent {
  bytes actorId = 1;
  Event event = 2;
  bytes signature = 3;
}

enum BlockType {
  EVENT  = 1;
  ACTION = 2;
}

message BlockRequest {
  BlockType blockType = 1;
  bytes blockId = 2; // if type is action and no blockId, peer will give us latest
}

message BlockResponse {
  bytes blockId = 1;
  bytes blockContent = 2;
}

message GatheringID {
  bytes pubKey = 1;
  string uuid = 2;
}`)
