# HYAPI Swagger Testing Guide

This guide provides copy-paste values for testing the API endpoints using the Swagger UI interface at `http://localhost:3000/api-docs`.

## **Test User Address**
Use this address for all `user` fields:
```text
0x0e09b56ef137f417e424f1265425e93bfff77e17
```

---

## **Endpoints & Parameters**

### **1. GET /trades**
*Retrieve trade history.*

| Parameter | Value | Description |
|-----------|-------|-------------|
| `user` | `0x0e09b56ef137f417e424f1265425e93bfff77e17` | **Required** |
| `coin` | `BTC-PERP` | *Optional* |
| `builderOnly` | `true` | *Optional* |

### **2. GET /pnl**
*Calculate PnL metrics.*

| Parameter | Value | Description |
|-----------|-------|-------------|
| `user` | `0x0e09b56ef137f417e424f1265425e93bfff77e17` | **Required** |
| `maxStartCapital` | `10000` | *Optional (Fair competition mode)* |
| `builderOnly` | `true` | *Optional* |

### **3. GET /positions/history**
*Reconstruct position history over time.*

| Parameter | Value | Description |
|-----------|-------|-------------|
| `user` | `0x0e09b56ef137f417e424f1265425e93bfff77e17` | **Required** |
| `coin` | `BTC-PERP` | *Optional* |

### **4. GET /leaderboard**
*View ranked users.*

| Parameter | Value | Description |
|-----------|-------|-------------|
| `metric` | `pnl` | **Required** (Options: `pnl`, `volume`, `returnPct`) |
| `builderOnly` | `false` | *Optional* |

### **5. POST /leaderboard/users**
*Register a user for tracking.*

**Request Body (JSON):**
```json
{
  "user": "0x0e09b56ef137f417e424f1265425e93bfff77e17"
}
```

### **6. GET /deposits**
*View deposit history.*

| Parameter | Value | Description |
|-----------|-------|-------------|
| `user` | `0x0e09b56ef137f417e424f1265425e93bfff77e17` | **Required** |
