$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlExe = 'C:\xampp\mysql\bin\mysqld.exe'
$mysqlConfig = 'C:\xampp\mysql\bin\my.ini'
$nodeExe = (Get-Command node.exe).Source
$logRoot = Join-Path $env:LOCALAPPDATA 'AZUHostel\logs'
$null = New-Item -ItemType Directory -Force -Path $logRoot

function Test-LocalPort($port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne(500)) { return $false }
    $client.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-ForPort($port, $name) {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-LocalPort $port) { return }
    Start-Sleep -Seconds 1
  }
  throw "$name did not start listening on port $port. Check logs in $logRoot."
}

if (-not (Test-LocalPort 3306)) {
  if (-not (Test-Path $mysqlExe) -or -not (Test-Path $mysqlConfig)) {
    throw 'XAMPP MySQL was not found at C:\xampp\mysql.'
  }
  Start-Process -FilePath $mysqlExe `
    -ArgumentList @("--defaults-file=$mysqlConfig", '--console') `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logRoot 'mysql.log') `
    -RedirectStandardError (Join-Path $logRoot 'mysql-error.log')
  Wait-ForPort 3306 'XAMPP MySQL'
}

$lanAddresses = @(
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' -and
      $_.AddressState -eq 'Preferred'
    } |
    Select-Object -ExpandProperty IPAddress -Unique
)
$origins = @('http://localhost:5173', 'http://127.0.0.1:5173') +
  @($lanAddresses | ForEach-Object { "http://${_}:5173" })
$env:FRONTEND_ORIGIN = $origins -join ','

if (-not (Test-LocalPort 5000)) {
  Start-Process -FilePath $nodeExe `
    -ArgumentList 'src\server.js' `
    -WorkingDirectory (Join-Path $projectRoot 'backend') `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logRoot 'backend.log') `
    -RedirectStandardError (Join-Path $logRoot 'backend-error.log')
  Wait-ForPort 5000 'AZU backend'
}

if (-not (Test-LocalPort 5173)) {
  Start-Process -FilePath $nodeExe `
    -ArgumentList 'node_modules\vite\bin\vite.js --host 0.0.0.0' `
    -WorkingDirectory (Join-Path $projectRoot 'frontend') `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logRoot 'frontend.log') `
    -RedirectStandardError (Join-Path $logRoot 'frontend-error.log')
  Wait-ForPort 5173 'AZU frontend'
}

Write-Output 'AZU Hostel Management is ready at http://localhost:5173'
foreach ($address in $lanAddresses) {
  Write-Output "Mobile test link (same Wi-Fi): http://${address}:5173"
}
