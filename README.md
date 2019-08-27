# crdt-event-log-lite

# How it works

Event-Log Lite is a simply CRDT store that builds upon an OP log.

For every entry/action in the op log, there are two entries added to the DAG. An action and an event that acts like a clock

![Example](https://i.imgur.com/TF6Rjj6.png)

The end result is a DAG that looks like this (given no concurrency).
The cool thing about this approach is that, once an event for an actor is verified, the entire chain of actions performed by the actor can be added to the log without verifying any more signatures.
So you only need to verify as many signatures as there are actors in the log.
In concurrent situations, there should be forks from specific events. The thought is that forks would be treated as concurrent and be put into order by action hash when reconstructing the log to have deterministic reconstruction.
