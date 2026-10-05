param(
  [ValidateSet('telemetry','start-feedback','stop-feedback','offline')][string]$Kind = 'telemetry',
  [string]$CommandId,
  [string]$ConnectionFile = (Join-Path $PSScriptRoot '..\..\mqtt-connection-private.json')
)
$connection = Get-Content -LiteralPath $ConnectionFile -Raw | ConvertFrom-Json
$message = [ordered]@{
  messageId = [guid]::NewGuid().ToString()
  token = $connection.deviceToken
  measuredAt = [DateTime]::UtcNow.ToString('o')
}
$topic = $connection.topics.telemetry
if ($Kind -eq 'telemetry') {
  $message.samples = @(
    @{componentId=$connection.components.motor; reportedState='STOPPED'; quality='CONFIRMED'},
    @{componentId=$connection.components.temperature; reportedState='VALID'; quality='CONFIRMED'; value='28.4'; unit='C'},
    @{componentId=$connection.components.humidity; reportedState='VALID'; quality='CONFIRMED'; value='72'; unit='%'}
  )
} elseif ($Kind -eq 'offline') {
  $topic = $connection.topics.status
  $message.status = 'OFFLINE'
} else {
  if (-not $CommandId) { throw 'Copy commandId from the received commands message and pass -CommandId.' }
  [guid]::Parse($CommandId) | Out-Null
  $topic = $connection.topics.feedback
  $message.componentId = $connection.components.motor
  $message.reportedState = if ($Kind -eq 'start-feedback') {'RUNNING'} else {'STOPPED'}
  $message.quality = 'CONFIRMED'
  $message.commandId = $CommandId
}
Write-Output "Publish topic: $topic"
Write-Output 'QoS: 1. Retain: OFF. Paste the JSON below into MQTT Explorer (not the topic/settings lines).'
$message | ConvertTo-Json -Depth 6
