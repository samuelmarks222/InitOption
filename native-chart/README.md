# Shared OTC transport modules

The former standalone chart UI and server have been removed for a chart rebuild.
`simulation.mjs` and `websocket.mjs` remain here because the existing OTC service
imports them. They provide simulated market ticks and WebSocket transport, not a
chart renderer. See `server/otc/README.md` for operating and testing the service.
