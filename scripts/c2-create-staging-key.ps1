param(
  [Parameter(Mandatory = $true)] [string] $ProjectId,
  [Parameter(Mandatory = $true)] [string] $AuthorizedOperation,
  [Parameter(Mandatory = $true)]
  [ValidateSet('schema', 'rows', 'identity', 'session')] [string] $Profile
)

$ErrorActionPreference = 'Stop'
$expectedId = '6ad55be5003719f6b399'
$protectedId = '6ac044af0008cbdda070'
$expectedName = 'NUY Creators ' + [char]0x2014 + ' Academia Staging'
$configPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env.c2.local'
$profiles = @{
  schema = @{ envKey = 'APPWRITE_C2_SCHEMA_API_KEY'; scopes = @(
    'databases.read', 'databases.write', 'tables.read', 'tables.write',
    'columns.read', 'columns.write', 'indexes.read', 'indexes.write') }
  rows = @{ envKey = 'APPWRITE_C2_ROWS_API_KEY'; scopes = @('rows.read', 'rows.write') }
  identity = @{ envKey = 'APPWRITE_C2_IDENTITY_API_KEY'; scopes = @(
    'users.read', 'users.write', 'teams.read', 'teams.write') }
  session = @{ envKey = 'APPWRITE_C2_SESSION_API_KEY'; scopes = @('sessions.write') }
}
$selected = $profiles[$Profile]
if ($ProjectId -ne $expectedId -or $ProjectId -eq $protectedId -or
    $AuthorizedOperation -ne 'create-staging-key') {
  throw 'C2: ID protegido/divergente ou operação não autorizada; nenhuma chave criada.'
}
if (-not (Test-Path -LiteralPath $configPath)) {
  throw 'C2: configuração local isolada ausente.'
}
$config = Get-Content -LiteralPath $configPath -Raw
if ($config -notmatch '(?m)^APPWRITE_ENDPOINT=https://api\.edocs\.phiq\.com\.br/v1\r?$' -or
    $config -notmatch '(?m)^APPWRITE_PROJECT_ID=6ad55be5003719f6b399\r?$' -or
    $config -notmatch '(?m)^APPWRITE_EXPECTED_PROJECT_ID=6ad55be5003719f6b399\r?$' -or
    $config -match "(?m)^$($selected.envKey)=") {
  throw 'C2: configuração divergente ou chave já presente; nenhuma chave criada.'
}

# Read-only Console-session identity check immediately before the write.
$rawProject = (& appwrite project get --project-id $ProjectId --json 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'C2: leitura do projeto falhou; nenhuma chave criada.' }
$jsonStart = $rawProject.IndexOf('{')
if ($jsonStart -lt 0) { throw 'C2: resposta de identidade inválida.' }
$project = $rawProject.Substring($jsonStart) | ConvertFrom-Json
if ($project.'$id' -ne $expectedId -or $project.name -ne $expectedName -or
    $project.status -ne 'active') {
  throw 'C2: identidade remota divergente; nenhuma chave criada.'
}

# Each key has one restricted role and lasts one hour.
$scopes = $selected.scopes
$scopeArgs = @($scopes | ForEach-Object { '--scopes'; $_ })
$rawKey = (& appwrite project create-ephemeral-key --project-id $ProjectId `
  --duration 3600 @scopeArgs --json --show-secrets 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) {
  throw 'C2: a instalação recusou a emissão de chave temporária pela CLI; confira a compatibilidade no Console. Nenhum segredo foi gravado.'
}
$keyStart = $rawKey.IndexOf('{')
if ($keyStart -lt 0) { throw 'C2: resposta de chave inválida; não foi gravada.' }
$issued = $rawKey.Substring($keyStart) | ConvertFrom-Json
$secret = [string] $issued.secret
if ($secret -notmatch '^[A-Za-z0-9._-]{20,}$') {
  $fieldNames = @($issued.PSObject.Properties.Name) -join ','
  throw "C2: chave não retornada no formato esperado ($fieldNames); não foi gravada."
}
[System.IO.File]::AppendAllText($configPath, "$($selected.envKey)=$secret`n")
Write-Output "C2_KEY_CREATED profile=$Profile project=$ProjectId expires_in_seconds=3600 scopes=$($scopes.Count)"
