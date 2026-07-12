# Sets Android SDK / Java paths for this machine, then runs Expo CLI.
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$env:ANDROID_HOME = "K:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "K:\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
# Short path avoids Windows 260-char ninja limits and isolates from corrupt D:\WorkData\.gradle caches.
$gradleHome = "E:\g"
New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null
$env:GRADLE_USER_HOME = $gradleHome
$env:Path = @(
  "$env:JAVA_HOME\bin",
  "$env:ANDROID_HOME\platform-tools",
  "$env:ANDROID_HOME\emulator",
  "$env:ANDROID_HOME\cmdline-tools\latest\bin",
  $env:Path
) -join ";"

$localProps = Join-Path $PSScriptRoot "..\android\local.properties"
if (Test-Path (Split-Path $localProps)) {
  "sdk.dir=K\:\\Android\\Sdk" | Set-Content -Path $localProps -Encoding ASCII
}

Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "GRADLE_USER_HOME=$env:GRADLE_USER_HOME"

& npx expo @Args
exit $LASTEXITCODE
