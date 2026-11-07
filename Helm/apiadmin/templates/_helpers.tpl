{{/*
Expand the name of the chart.
*/}}
{{- define "apiadmin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "apiadmin.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "apiadmin.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "apiadmin.labels" -}}
helm.sh/chart: {{ include "apiadmin.chart" . }}
{{ include "apiadmin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "apiadmin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "apiadmin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "apiadmin.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "apiadmin.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "apiadmin.secretName" -}}
{{- if .Values.config.existingSecret }}
{{- .Values.config.existingSecret }}
{{- else }}
{{- printf "%s-secret" (include "apiadmin.fullname" .) }}
{{- end }}
{{- end }}

{{- define "apiadmin.mongodb.host" -}}
{{- printf "%s-mongodb" (include "apiadmin.fullname" .) }}
{{- end }}

{{- define "apiadmin.redis.host" -}}
{{- printf "%s-redis" (include "apiadmin.fullname" .) }}
{{- end }}

{{/*
Reuse an existing Secret value across upgrades. Otherwise use the explicit value, or generate one.
*/}}
{{- define "apiadmin.secretValue" -}}
{{- $root := index . 0 -}}
{{- $explicit := index . 1 -}}
{{- $secretName := index . 2 -}}
{{- $key := index . 3 -}}
{{- if $explicit -}}
{{- $explicit -}}
{{- else -}}
{{- $prev := lookup "v1" "Secret" $root.Release.Namespace $secretName -}}
{{- if and $prev $prev.data (index $prev.data $key) -}}
{{- index $prev.data $key | b64dec -}}
{{- else -}}
{{- randAlphaNum 48 -}}
{{- end -}}
{{- end -}}
{{- end }}



