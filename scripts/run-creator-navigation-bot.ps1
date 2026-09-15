$ErrorActionPreference = "Stop"

$email = $env:TINY_TITANS_VISUAL_BOT_EMAIL
if ([string]::IsNullOrWhiteSpace($email)) { $email = "ttrcbot@ttrc.com" }

$password = $env:TINY_TITANS_VISUAL_BOT_PASSWORD
if ([string]::IsNullOrWhiteSpace($password)) {
  $secure = Read-Host "TinyTitans BOT password" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:TINY_TITANS_VISUAL_BOT_EMAIL = $email
$env:TINY_TITANS_VISUAL_BOT_PASSWORD = $password
$env:TINY_TITANS_TEST_URL = if ($env:TINY_TITANS_TEST_URL) { $env:TINY_TITANS_TEST_URL } else { "http://127.0.0.1:4173" }

Write-Host "Starting Creator Navigation BOT against $($env:TINY_TITANS_TEST_URL)"
npm run test:creator-navigation
