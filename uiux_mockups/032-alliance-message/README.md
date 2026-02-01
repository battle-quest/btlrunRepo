# Screen 032: Alliance Message

A private messaging interface for communicating with allies.

## Purpose

- **Private Chat**: Secure communication channel between alliance members.
- **Coordination**: Plan moves, share resource locations, or plot betrayals.

## Key Elements

| Element | Description |
|---------|-------------|
| **Header** | Ally name, avatar, and online status. |
| **Chat History** | Scrollable list of sent/received messages. |
| **Input Area** | Text field and send button. |

## Navigation

- **From**: `031-tribute-details` (if "Message" is unlocked) or `03-status-inventory-map` (if roster list supports messaging).
- **Back**: Returns to the previous screen.

## Viewing

```bash
pnpm dev:pwa
# Open: http://localhost:5173/uiux/032-alliance-message/index.html
```
