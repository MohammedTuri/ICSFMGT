param(
    [string]$FrontendHost = 'localhost',
    [int]$FrontendPort = 5173
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$portsToClear = @(3001, 5173, 5174, 5175, 5176, 5177, 5178)

function Stop-ProcessOnPort {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $connections) { return }

    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        if (-not $processId) { continue }
        if ($processId -eq $PID) { continue }

        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping stale process PID $processId ($($proc.ProcessName)) on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "Starting ICS File Management System..." -ForegroundColor Cyan
Write-Host "Cleaning up stale ports..." -ForegroundColor DarkYellow
foreach ($port in $portsToClear) {
    Stop-ProcessOnPort -Port $port
}

Write-Host "Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend: http://${FrontendHost}:$FrontendPort" -ForegroundColor Yellow
Write-Host ""

npm run start:full
