{{- define "task-manager.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "task-manager.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "task-manager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" -}}
{{- end -}}

{{- define "task-manager.namespace" -}}
{{- default .Release.Namespace .Values.namespace.name -}}
{{- end -}}

{{- define "task-manager.labels" -}}
helm.sh/chart: {{ include "task-manager.chart" . }}
app.kubernetes.io/name: {{ include "task-manager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "task-manager.selectorLabels" -}}
app.kubernetes.io/name: {{ include "task-manager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "task-manager.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "task-manager.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "task-manager.backend.fullname" -}}
{{- printf "%s-backend" (include "task-manager.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.frontend.fullname" -}}
{{- printf "%s-frontend" (include "task-manager.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.frontend.canary.fullname" -}}
{{- printf "%s-frontend-canary" (include "task-manager.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.secretName" -}}
{{- printf "%s-db-app" (include "task-manager.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.db.clusterName" -}}
{{- default (printf "%s-db" (include "task-manager.fullname" .)) .Values.database.clusterName | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "task-manager.uploadsPvcName" -}}
{{- if .Values.backend.persistence.existingClaim -}}
{{- .Values.backend.persistence.existingClaim -}}
{{- else -}}
{{- printf "%s-uploads" (include "task-manager.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
