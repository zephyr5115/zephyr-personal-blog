param([string]$Account = 'zephyr5115', [string]$Repository = 'zephyr-personal-blog')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if (!$gitCommand) { throw 'Install Git and Git Credential Manager first.' }
$gitExe = $gitCommand.Source
function Invoke-Git([string[]]$Arguments) {
    & $gitExe -C $projectRoot @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Git operation failed. No force push was attempted.' }
}
$remote = "https://github.com/$Account/$Repository.git"
$siteUrl = "https://$Account.github.io/$Repository/"
$config = Get-Content -LiteralPath (Join-Path $projectRoot 'content/site.json') -Raw | ConvertFrom-Json
if ($config.siteUrl -ne $siteUrl) { throw 'Update content/site.json siteUrl and run node scripts/build.mjs first.' }
$oldPrompt = $env:GIT_TERMINAL_PROMPT
$oldInteractive = $env:GCM_INTERACTIVE
$credentialText = $null; $credential = @{}; $headers = $null
try {
    $env:GIT_TERMINAL_PROMPT = '0'; $env:GCM_INTERACTIVE = 'Never'
    $credentialText = "protocol=https`nhost=github.com`nusername=$Account`n`n" | & $gitExe credential fill 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Sign in first: git credential-manager github login --device --username zephyr5115 --no-ui' }
    foreach ($line in $credentialText) {
        if ($line -match '^([^=]+)=(.*)$') { $credential[$Matches[1]] = $Matches[2] }
    }
    if (!$credential.password) { throw 'No GitHub credential is available in this Windows session.' }
    $headers = @{Authorization = "Bearer $($credential.password)"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28'; 'User-Agent' = 'Zephyr-Blog-Deploy'}
    function Invoke-GitHub([string]$Method, [string]$ApiPath, $Body = $null) {
        $params = @{Method = $Method; Uri = "https://api.github.com$ApiPath"; Headers = $headers; ErrorAction = 'Stop'}
        if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10); $params.ContentType = 'application/json; charset=utf-8' }
        Invoke-RestMethod @params
    }
    $profile = Invoke-GitHub 'GET' '/user'
    if ($profile.login -cne $Account) { throw "Signed-in account is not $Account; stopping before publishing." }
    $existing = $null
    try { $existing = Invoke-GitHub 'GET' "/repos/$Account/$Repository" }
    catch { if ([int]$_.Exception.Response.StatusCode -ne 404) { throw } }
    $hasGit = Test-Path -LiteralPath (Join-Path $projectRoot '.git')
    if ($existing -and !$hasGit -and $existing.size -gt 0) { throw 'The target repository already contains files. Inspect it before publishing from a fresh folder.' }
    if ($existing -and $existing.private) { throw 'The target repository is private; this script will not change its visibility.' }
    if (!$existing) {
        $null = Invoke-GitHub 'POST' '/user/repos' @{name=$Repository; description='Zephyr personal blog: writing, learning and small experiments.'; private=$false; auto_init=$false; homepage=$siteUrl}
        Write-Output "Created public repository: $Account/$Repository"
    }
    if (!$hasGit) {
        Invoke-Git @('init','-b','main')
        Invoke-Git @('config','user.name','Zephyr')
        Invoke-Git @('config','user.email',"$($profile.id)+$Account@users.noreply.github.com")
        Invoke-Git @('remote','add','origin',$remote)
    }
    $actualRemote = & $gitExe -C $projectRoot remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $actualRemote.Trim() -ne $remote) { throw 'Origin does not match the intended blog repository.' }
    $branch = & $gitExe -C $projectRoot symbolic-ref --short HEAD
    if ($branch.Trim() -ne 'main') { throw 'The current branch must be main.' }
    Invoke-Git @('add','--all')
    & $gitExe -C $projectRoot diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { Invoke-Git @('commit','-m','Publish Zephyr personal blog') }
    elseif ($LASTEXITCODE -ne 0) { throw 'Unable to inspect staged changes.' }
    Invoke-Git @('push','-u','origin','main')
    $pages = $null
    try { $pages = Invoke-GitHub 'GET' "/repos/$Account/$Repository/pages" }
    catch { if ([int]$_.Exception.Response.StatusCode -ne 404) { throw } }
    if (!$pages) { $pages = Invoke-GitHub 'POST' "/repos/$Account/$Repository/pages" @{build_type='legacy'; source=@{branch='main';path='/'}} }
    elseif ($pages.source.branch -ne 'main' -or $pages.source.path -ne '/') { throw 'Existing Pages source differs; inspect repository Settings > Pages before changing it.' }
    Write-Output "Pages configured: $($pages.html_url)"
    Write-Output 'Wait for GitHub to finish building, then verify the public site before sharing its URL.'
}
finally {
    if ($headers) { $headers.Clear() }; $credential.Clear(); $credentialText = $null
    $env:GIT_TERMINAL_PROMPT = $oldPrompt; $env:GCM_INTERACTIVE = $oldInteractive
}
