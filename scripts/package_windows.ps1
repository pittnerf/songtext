#Requires -Version 5.1
<#
.SYNOPSIS
  Build a standalone Windows build_songs.exe with PyInstaller.
.DESCRIPTION
  Run this on Windows (or from WSL via powershell.exe). Requires Python 3.10+.
#>
$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

function Test-Python {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [string[]]$Args = @()
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $Command @Args -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previous
    return $ok
}

function Find-Python {
    foreach ($fallback in @("C:\Python314\python.exe", "C:\Python313\python.exe", "C:\Python312\python.exe")) {
        if (Test-Path $fallback) {
            return @{ Command = $fallback; Args = @() }
        }
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        foreach ($version in @("-3.12", "-3.11", "-3.13", "-3.10", "-3")) {
            if (Test-Python -Command $py.Source -Args @($version)) {
                return @{ Command = $py.Source; Args = @($version) }
            }
        }
    }

    foreach ($name in @("python", "python3")) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and (Test-Python -Command $cmd.Source)) {
            return @{ Command = $cmd.Source; Args = @() }
        }
    }

    throw "Python 3.10+ was not found. Install Python from https://www.python.org/downloads/ and tick 'Add python.exe to PATH'."
}

$python = Find-Python
Write-Host "Using $($python.Command) $($python.Args -join ' ')"

& $python.Command @($python.Args) -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $python.Command @($python.Args) -m pip install -r (Join-Path $Root "requirements-build.txt")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$spec = Join-Path $Root "scripts\build_songs.spec"
& $python.Command @($python.Args) -m PyInstaller --noconfirm --clean $spec
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$built = Join-Path $Root "dist\build_songs.exe"
if (-not (Test-Path $built)) {
    throw "PyInstaller finished but dist\build_songs.exe is missing."
}

Copy-Item $built (Join-Path $Root "build_songs.exe") -Force
Write-Host "Built:"
Write-Host "  $built"
Write-Host "  $(Join-Path $Root 'build_songs.exe')"
Write-Host "Third parties can run:  .\Build-Songs.ps1"
