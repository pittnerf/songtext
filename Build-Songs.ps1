#Requires -Version 5.1
<#
.SYNOPSIS
  Convert song PDFs to images and rebuild public/data/songs.json.
.DESCRIPTION
  Windows entry point that does not require Python. Looks for build_songs.exe
  next to this script, then in dist\. Extra arguments are passed through,
  for example: .\Build-Songs.ps1 --scale 2.5
#>
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$exe = @(
    (Join-Path $Root "build_songs.exe"),
    (Join-Path $Root "dist\build_songs.exe")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $exe) {
    Write-Error @"
build_songs.exe was not found.

Place the Windows executable in this folder (or in dist\) and try again.
You can download it from GitHub Actions artifacts, or build it with:

  powershell -ExecutionPolicy Bypass -File .\scripts\package_windows.ps1
"@
}

Write-Host "Using $exe"
& $exe --root $Root @args
exit $LASTEXITCODE
