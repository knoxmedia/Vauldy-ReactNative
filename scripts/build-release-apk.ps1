# Build a standalone release APK for real Android devices (真机安装).
# arm64-v8a: 64-bit phones/tablets (default)
# armeabi-v7a: 32-bit ARM devices
# all: both architectures in one APK (larger file)
param(
  [ValidateSet("arm64-v8a", "armeabi-v7a", "all")]
  [string]$Arch = "arm64-v8a",
  [switch]$Install
)

$env:ANDROID_HOME = "K:\Android\Sdk"
$env:ANDROID_SDK_ROOT = "K:\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
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

$root = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $root "android"
$localProps = Join-Path $androidDir "local.properties"
"sdk.dir=K\:\\Android\\Sdk" | Set-Content -Path $localProps -Encoding ASCII

$version = (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version
$distDir = Join-Path $root "dist"
$archLabel = if ($Arch -eq "all") { "universal" } else { $Arch }
$apkName = "vauldy-$version-$archLabel-release.apk"
$srcApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
$destApk = Join-Path $distDir $apkName

$archArg = if ($Arch -eq "all") { "armeabi-v7a,arm64-v8a" } else { $Arch }

Write-Host "Building release APK ($archLabel)..."
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "GRADLE_USER_HOME=$env:GRADLE_USER_HOME"
Write-Host ""

Push-Location $root
try {
  node scripts/embed-pdfjs.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  node scripts/generate-adaptive-icon.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

# Release stale Gradle locks from interrupted builds before assembling.
Push-Location $androidDir
try {
  & .\gradlew.bat --stop 2>$null
} finally {
  Pop-Location
}

Push-Location $androidDir
try {
  & .\gradlew.bat assembleRelease "-PreactNativeArchitectures=$archArg" -x lint -x test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

if (-not (Test-Path $srcApk)) {
  Write-Error "Release APK not found: $srcApk"
  exit 1
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item $srcApk $destApk -Force

Write-Host ""
Write-Host "Release APK: $destApk"
Write-Host "Size: $([math]::Round((Get-Item $destApk).Length / 1MB, 2)) MB"
Write-Host ""
Write-Host "Install on device:"
Write-Host "  adb install -r `"$destApk`""

if ($Install) {
  $adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
  if (-not (Test-Path $adb)) {
    Write-Error "adb not found: $adb"
    exit 1
  }
  $devices = & $adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of devices" }
  if ($devices.Count -eq 0) {
    Write-Error "No device connected. Connect a phone via USB (with USB debugging enabled) and retry with -Install."
    exit 1
  }
  Write-Host ""
  Write-Host "Installing to connected device..."
  & $adb install -r $destApk
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Installed successfully."
}
