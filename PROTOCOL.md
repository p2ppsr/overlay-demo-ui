# HelloWorld Protocol

Broadcast and track HelloWorld messages with Bitcoin.

## Goals

- Allow a user to create and broadcast HelloWorld messages
- Allow a user to attach money to the message at the time of creation
- Track and display all broadcasted HelloWorld messages

## Protocol

Creating a Bitcoin output script that complies with this protocol gives the elements of that script the following meanings:

Script Element | Meaning
---------------|--------------------
0	             | `<pubkey>`
1	             | `OP_CHECKSIG`
2	             | Message data
3	             | A valid ECDSA signature from the field 0 public key over fields 1-2
…              |	`OP_DROP` / `OP_2DROP` — Drop fields 2-4 from the stack


This protocol allows for the creation, broadcasting, and tracking of messages using Bitcoin transactions, with the added ability to attach value to each message.