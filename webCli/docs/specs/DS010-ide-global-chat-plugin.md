# DS010 - IDE Global Chat Plugin

## Goal
Expose `webCli` as a persistent, workspace-level chat surface inside Explorer `#file-exp` through a global application plugin.

## Plugin Identity
- **Agent owner**: `webCli`
- **Plugin category**: `application`
- **Contribution type**: `mount`
- **Plugin type**: `global`
- **Host slot**: `file-exp:global`

## UX Contract
The plugin must render as a floating chat trigger visible on the right side of `#file-exp` at all times.

When the trigger is activated:
1. Open a full-screen chat panel.
2. Render chat content through an iframe targeting `/webchat?agent=webCli`.
3. Show a header action that opens `/webchat?agent=webAdmin` in a separate page/tab.
4. Show an explicit close button (`X`) that hides the panel and keeps only the floating trigger visible.

## Persistence and Session Behavior
- The iframe should remain mounted when toggling panel visibility to preserve in-browser webchat context.
- Closing the panel must not destroy plugin component state.

## Host Compatibility
- Explorer plugin discovery must accept application plugins with `type: "global"`.
- The host must mount `file-exp:global` independently from toolbar, right-bar, and internal slots.

## Operational Constraints
- The plugin must not mutate Explorer shell navigation or layout outside its host slot.
- Agent invocations are executed through the existing webchat-to-MCP path.
- The plugin must degrade gracefully if `webCli` or `webAdmin` webchat routes are temporarily unavailable.
