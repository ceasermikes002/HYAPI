$baseUrl = "http://localhost:3000/api"
$user = "0x0e09b56ef137f417e424f1265425e93bfff77e17"

Write-Host "1. Testing /trades endpoint..." -ForegroundColor Cyan
try {
    $trades = Invoke-RestMethod -Uri "$baseUrl/trades?user=$user" -Method Get
    Write-Host "Success! Retrieved $($trades.Count) trades." -ForegroundColor Green
} catch {
    Write-Host "Failed to get trades: $_" -ForegroundColor Red
}

Write-Host "`n2. Testing /pnl endpoint..." -ForegroundColor Cyan
try {
    $pnl = Invoke-RestMethod -Uri "$baseUrl/pnl?user=$user" -Method Get
    Write-Host "Success! PnL: $($pnl.realizedPnl), Return: $($pnl.returnPct)%" -ForegroundColor Green
} catch {
    Write-Host "Failed to get PnL: $_" -ForegroundColor Red
}

Write-Host "`n3. Adding user to Leaderboard..." -ForegroundColor Cyan
try {
    $body = @{ user = $user } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$baseUrl/leaderboard/users" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "Failed to add user: $_" -ForegroundColor Red
}

Write-Host "`n4. Testing /leaderboard endpoint..." -ForegroundColor Cyan
try {
    $lb = Invoke-RestMethod -Uri "$baseUrl/leaderboard?metric=pnl" -Method Get
    Write-Host "Success! Leaderboard has $($lb.Count) entries." -ForegroundColor Green
    $entry = $lb | Where-Object { $_.user -eq $user }
    if ($entry) {
        Write-Host "Found user on leaderboard at rank $($entry.rank)" -ForegroundColor Green
    } else {
        Write-Host "User not found on leaderboard yet." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to get leaderboard: $_" -ForegroundColor Red
}

Write-Host "`n5. Testing /pnl with builderOnly=true..." -ForegroundColor Cyan
try {
    $pnl = Invoke-RestMethod -Uri "$baseUrl/pnl?user=$user&builderOnly=true" -Method Get
    Write-Host "Success! Builder-Only PnL: $($pnl.realizedPnl)" -ForegroundColor Green
    if ($pnl.tainted) {
        Write-Host "Note: PnL is marked as TAINTED (contains non-builder trades)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to get Builder-Only PnL: $_" -ForegroundColor Red
}
