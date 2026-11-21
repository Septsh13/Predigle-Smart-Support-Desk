$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'
$pythonExe = Join-Path $backendDir '.venv\Scripts\python.exe'

if (-not (Test-Path (Join-Path $backendDir '.env'))) {
    Copy-Item (Join-Path $repoRoot '.env.example') (Join-Path $backendDir '.env')
    Write-Host 'Created backend/.env from .env.example.'
}
if (-not (Test-Path $pythonExe)) {
    if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
        throw 'Python was not found. Install Python 3.10 or newer, then run this command again.'
    }
    Write-Host 'First run: creating the Python environment and installing backend packages. This may take a while.'
    & py -m venv (Join-Path $backendDir '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the backend virtual environment.' }
    if (-not (Test-Path $pythonExe)) { throw 'The Python virtual environment was not created.' }
    & $pythonExe -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip.' }
    & $pythonExe -m pip install -r (Join-Path $backendDir 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Could not install backend packages.' }
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npm is missing. Install Node.js 18.19 or newer, then run this command again.'
}

function Test-MongoReady {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $connect = $client.BeginConnect('127.0.0.1', 27017, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(700)) { return $false }
        $client.EndConnect($connect)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

if (-not (Test-MongoReady)) {
    $mongoService = Get-Service -Name 'MongoDB' -ErrorAction SilentlyContinue
    if ($mongoService -and $mongoService.Status -ne 'Running') {
        try {
            Start-Service -Name 'MongoDB'
        } catch {
            Write-Warning 'Could not start the MongoDB Windows service. Trying to launch the local server directly.'
        }
        for ($attempt = 0; $attempt -lt 15; $attempt++) {
            if (Test-MongoReady) { break }
            Start-Sleep -Seconds 1
        }
    }

    if (-not (Test-MongoReady)) {
        $mongoExe = Get-ChildItem 'C:\Program Files\MongoDB\Server\*\bin\mongod.exe' -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1 -ExpandProperty FullName
        if (-not $mongoExe) {
            throw 'MongoDB is not running and mongod.exe was not found under C:\Program Files\MongoDB\Server. Start/install MongoDB, then try again.'
        }

        $mongoData = Join-Path $env:LOCALAPPDATA 'SmartSupportDesk\MongoDB\data'
        New-Item -ItemType Directory -Force -Path $mongoData | Out-Null
        $mongoCommand = "& '$mongoExe' --dbpath '$mongoData'"
        $mongoEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($mongoCommand))
        Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $mongoEncoded)

        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Seconds 1
            if (Test-MongoReady) { $ready = $true; break }
        }
        if (-not $ready) {
            throw 'MongoDB did not start on localhost:27017. Check the MongoDB window for an error.'
        }
    }
}

$backendCommand = @"
Set-Location -LiteralPath '$backendDir'
`$python = '$pythonExe'
`$ticketCountOutput = & `$python manage.py shell -c 'from tickets import db; print(db.get_tickets_collection().count_documents({}))'
if (`$LASTEXITCODE -ne 0) { Write-Host 'Could not connect to MongoDB or inspect tickets.' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
`$ticketCountLine = `$ticketCountOutput | Where-Object { `$_ -match '^\d+`$' } | Select-Object -Last 1
if (-not `$ticketCountLine) { Write-Host 'Could not read the ticket count.' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
if ([int]`$ticketCountLine -eq 0) {
    Write-Host 'First run: adding the sample tickets and demo accounts...'
    & `$python manage.py seed
    if (`$LASTEXITCODE -ne 0) { Read-Host 'Seeding failed. Press Enter to close'; exit 1 }
} else {
    Write-Host 'Existing tickets found; leaving your database data as it is.'
}
& `$python manage.py runserver
"@
$backendEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($backendCommand))
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $backendEncoded)

$frontendCommand = @"
Set-Location -LiteralPath '$frontendDir'
if (-not (Test-Path 'node_modules')) { npm install }
npm start
"@
$frontendEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($frontendCommand))
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $frontendEncoded)

Write-Host 'Smart Support Desk is starting.' -ForegroundColor Green
Write-Host 'MongoDB: http://localhost:27017'
Write-Host 'API:     http://127.0.0.1:8000/api'
Write-Host 'App:     http://localhost:4200'
Write-Host 'Keep the opened server windows running. Press Ctrl+C in each window to stop that service.'
