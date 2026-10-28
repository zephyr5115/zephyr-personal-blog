param(
    [switch]$Apply,
    [string]$FeedFile,
    [string]$PostsFile = (Join-Path $PSScriptRoot '../content/posts.json')
)
$ErrorActionPreference = 'Stop'
$postsPath = [IO.Path]::GetFullPath($PostsFile)
if ($FeedFile) { $xmlText = [IO.File]::ReadAllText([IO.Path]::GetFullPath($FeedFile), [Text.Encoding]::UTF8) }
else { $xmlText = (Invoke-WebRequest -Uri 'https://blog.csdn.net/ZephyrHY/rss/list' -TimeoutSec 30 -UseBasicParsing).Content }
if ([string]::IsNullOrWhiteSpace($xmlText)) { throw 'CSDN RSS returned no data. No files were changed.' }
$settings = [Xml.XmlReaderSettings]::new(); $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit; $settings.XmlResolver = $null
$reader = [Xml.XmlReader]::Create([IO.StringReader]::new($xmlText), $settings)
try { $feed = [Xml.XmlDocument]::new(); $feed.XmlResolver = $null; $feed.Load($reader) } finally { $reader.Dispose() }
$items = @($feed.SelectNodes('/rss/channel/item'))
if (!$items.Count) { throw 'No RSS articles found. No files were changed.' }
$posts = @(Get-Content -LiteralPath $postsPath -Raw -Encoding UTF8 | ConvertFrom-Json)
$known = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($post in $posts) { if (!$known.Add([string]$post.id)) { throw 'Duplicate IDs in posts.json. No files were changed.' } }
$added = [Collections.Generic.List[object]]::new(); $skipped = 0
foreach ($item in $items) {
    $link = $item.SelectSingleNode('link').InnerText.Trim()
    if ($link -notmatch '^https://blog\.csdn\.net/ZephyrHY/article/details/(\d+)/?$') { throw 'Unexpected article URL in RSS. No files were changed.' }
    $id = $Matches[1]
    if ($known.Contains($id)) { $skipped++; continue }
    $title = ($item.SelectSingleNode('title').InnerText -replace '^\s*#+\s*','').Trim()
    $descriptionNode = $item.SelectSingleNode('description')
    $description = if ($descriptionNode) { [Net.WebUtility]::HtmlDecode(($descriptionNode.InnerText -replace '<[^>]*>',' ')) -replace '\s+',' ' } else { '' }
    $dateText = $item.SelectSingleNode('pubDate').InnerText.Trim()
    $date = [DateTimeOffset]::Parse($dateText, [Globalization.CultureInfo]::InvariantCulture).ToString('yyyy-MM-dd')
    if (!$title -or !$date) { throw "Article $id has incomplete metadata. No files were changed." }
    $added.Add([pscustomobject][ordered]@{id=$id;title=$title;url="https://blog.csdn.net/ZephyrHY/article/details/$id";date=$date;category='其他';tags=@();excerpt=$description.Trim();html='';minutes=0;cover='assets/cover-general.svg';source='CSDN';fullText=$false})
    $null = $known.Add($id)
}
Write-Output "RSS items: $($items.Count); existing: $skipped; new: $($added.Count)."
foreach ($post in $added) { Write-Output "  $($post.date)  $($post.title)  $($post.url)" }
if (!$Apply) { Write-Output 'Preview only. Run again with -Apply to add new summaries.'; exit 0 }
if (!$added.Count) { Write-Output 'Nothing to add. Existing articles and full text were left untouched.'; exit 0 }
$merged = @($posts) + @($added.ToArray()) | Sort-Object date -Descending
$json = ConvertTo-Json -InputObject @($merged) -Depth 30
$temp = "$postsPath.sync.tmp"
try { [IO.File]::WriteAllText($temp, $json + "`n", [Text.UTF8Encoding]::new($false)); Move-Item -LiteralPath $temp -Destination $postsPath -Force }
finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force } }
Write-Output 'Added summaries. Existing article text, tags and covers were preserved. Run node scripts/build.mjs next.'
