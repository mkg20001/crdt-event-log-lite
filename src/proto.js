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

module.exports = protons(`

/* Chain Config */

message SignedChainConfig {
  bytes pubKey = 1;
  ChainConfig config = 2;
  bytes signature = 3;
}

message ChainConfig {
  int64 preferredHash = 1;
  repeated SubKey keys = 2;
  bytes ownerId = 3;
}

message SubKey {
  string id = 1;

  CollabrationType collabrate = 10;

  PermissionType permission = 20;

  DatabaseType database = 30;

  // space of 10 entries for config entries

}

enum CollabrationType {
  NONE = 1; // all keys controlled by same actor
  SIMPLE = 2; // subKey: actorId, value: $controlledByActorId
  MULTI = 3; // subKey: any, subSubKey: actorKey, valueSubKey: $controlledByActorId
}

enum PermissionType {
  OWNER = 1;
  ANYONE = 2;
  PRESPECIFIED = 3;
}

enum DatabaseType {
  FLATDB = 1;
}

/* Data */

message SignedEvent {
  bytes compressedActorKey = 1;
  Event event = 2;
  bytes signature = 3;
}

message Event {
  int64 eventCounter = 1;

  repeated bytes prev = 2;

  bytes actionId = 3;
  int64 eventHashType = 4;
}

message Action {
  bytes prev = 1;

  string dbId = 2;

  bytes payload = 3;
}

/* RPC */

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

`)
