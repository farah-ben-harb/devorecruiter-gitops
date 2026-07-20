{{/*
Expand the chart name.
This keeps the default resource name based on Chart.yaml unless nameOverride is set.
*/}}
{{- define "devorecruiter-api-back.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a fully qualified app name.
This prevents naming collisions when multiple releases are installed in one cluster.
*/}}
{{- define "devorecruiter-api-back.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart label value.
Kubernetes labels have length and character limits, so the value is normalized.
*/}}
{{- define "devorecruiter-api-back.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels applied to all FastAPI resources.
These labels make resources easier to find, group, and manage with Helm or Argo CD.
*/}}
{{- define "devorecruiter-api-back.labels" -}}
helm.sh/chart: {{ include "devorecruiter-api-back.chart" . }}
app.kubernetes.io/name: {{ include "devorecruiter-api-back.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: devorecruiter
app.kubernetes.io/component: api-back
{{- end -}}

{{/*
Selector labels used by Deployment and Service.
These labels must remain stable because Services use them to route traffic to Pods.
*/}}
{{- define "devorecruiter-api-back.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devorecruiter-api-back.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
