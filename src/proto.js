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

enum RPCError {
  OK            = 0;
  OTHER         = 1;
  CHAIN_UNKNOWN = 2;
  DB_UNKNOWN    = 3;
  BLOCK_UNKNOWN = 4;
  MALFORMED_REQ = 5;
  DEPTH_LENGTH  = 6;
  COOLDOWN      = 7; // TODO: define cooldown/anti-ddos strategies
}

enum BlockType {
  EVENT  = 1;
  ACTION = 2;
}

message BlockRequest {
  bytes chainId = 1;
  string dbId = 2;

  BlockType blockType = 3;
  bytes blockId = 4;
  int64 blockDepth = 5; // amount of blocks to pull based on previous of that one. protocol max is 20. only Action
}

message Block {
  bytes id = 1;
  bytes content = 2;
}

message BlockResponse {
  RPCError error = 1;

  repeated Block blocks = 2;
}

`)
