{{/*
Expand the chart name.
This keeps the default resource name based on Chart.yaml unless nameOverride is set.
*/}}
{{- define "devorecruiter-n8n.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a fully qualified app name.
This prevents naming collisions when multiple releases are installed in one cluster.
*/}}
{{- define "devorecruiter-n8n.fullname" -}}
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
{{- define "devorecruiter-n8n.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Render the pinned n8n image reference.
*/}}
{{- define "devorecruiter-n8n.image" -}}
{{- if .Values.image.digest -}}
{{- printf "%s:%s@%s" .Values.image.repository .Values.image.tag .Values.image.digest -}}
{{- else -}}
{{- printf "%s:%s" .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) -}}
{{- end -}}
{{- end -}}

{{/*
Render the pinned PostgreSQL client image used by the database-init Job.
*/}}
{{- define "devorecruiter-n8n.dbInitImage" -}}
{{- if .Values.database.init.image.digest -}}
{{- printf "%s:%s@%s" .Values.database.init.image.repository .Values.database.init.image.tag .Values.database.init.image.digest -}}
{{- else -}}
{{- printf "%s:%s" .Values.database.init.image.repository .Values.database.init.image.tag -}}
{{- end -}}
{{- end -}}

{{/*
Common labels applied to all n8n resources.
These labels make resources easier to find, group, and manage with Helm or Argo CD.
*/}}
{{- define "devorecruiter-n8n.labels" -}}
helm.sh/chart: {{ include "devorecruiter-n8n.chart" . }}
app.kubernetes.io/name: {{ include "devorecruiter-n8n.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: devorecruiter
app.kubernetes.io/component: n8n
{{- end -}}

{{/*
Selector labels used by Deployment and Service.
These labels must remain stable because Services use them to route traffic to Pods.
*/}}
{{- define "devorecruiter-n8n.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devorecruiter-n8n.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
