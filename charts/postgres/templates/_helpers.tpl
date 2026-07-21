{{/* Return the chart name, allowing an explicit short override. */}}
{{- define "devorecruiter-postgres.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Return a stable Kubernetes resource name for this PostgreSQL release. */}}
{{- define "devorecruiter-postgres.fullname" -}}
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

{{/* Build a label-safe chart name and version. */}}
{{- define "devorecruiter-postgres.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Common labels identify ownership and application role. */}}
{{- define "devorecruiter-postgres.labels" -}}
helm.sh/chart: {{ include "devorecruiter-postgres.chart" . }}
app.kubernetes.io/name: {{ include "devorecruiter-postgres.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: devorecruiter
app.kubernetes.io/component: database
{{- end -}}

{{/* Stable selector labels connect the StatefulSet and Service. */}}
{{- define "devorecruiter-postgres.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devorecruiter-postgres.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Combine the mutable tag with the immutable digest when configured. */}}
{{- define "devorecruiter-postgres.image" -}}
{{- printf "%s:%s" .Values.image.repository .Values.image.tag -}}
{{- with .Values.image.digest -}}@{{ . }}{{- end -}}
{{- end -}}
