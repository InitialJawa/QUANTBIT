$html = Join-Path $PSScriptRoot "about-quantbit.html"
if (!(Test-Path $html)) { Write-Host "File tidak ditemukan!" -Fore Red; exit }

$browsers = @(
  @{Name="msedge"; Path="$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"},
  @{Name="msedge"; Path="${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"},
  @{Name="chrome"; Path="$env:ProgramFiles\Google\Chrome\Application\chrome.exe"},
  @{Name="chrome"; Path="${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"}
)

$launched = $false
foreach ($b in $browsers) {
  if (Test-Path $b.Path) {
    Start-Process -FilePath $b.Path -ArgumentList "--kiosk `"$html`"" -NoNewWindow
    $launched = $true
    break
  }
}

if (!$launched) {
  Start-Process $html
}
